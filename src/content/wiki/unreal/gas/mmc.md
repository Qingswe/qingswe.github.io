---
title: MMC
description: MMC 用于按属性和上下文动态计算 GE 修改器数值。
tags: [unreal, gas, wiki, mmc, modifier]
updated: 2025-04-29
---

在虚幻引擎的 Gameplay Ability System (GAS) 中，MMC 是指 Modifier Magnitude Calculation（修饰器量级计算）。它是一个用于动态计算 Gameplay Effect 中属性修饰器（Modifier）强度的系统。MMC 允许开发者通过自定义逻辑（通常是基于角色属性、状态或其他游戏逻辑）来计算修饰器的数值，而不是直接使用固定的值或简单的数学公式。
  
一个属性的表示实现，比如一个受到 等级和天赋决定的 生命值上限属性
在创建的时候可以将相关的属性添加到监听来进行变动数值
```cpp
UMMC_MaxMana::UMMC_MaxMana()  
{  
    IntelligenceDef.AttributeToCapture = UAuraAttributeSet::GetIntelligenceAttribute();  
    IntelligenceDef.AttributeSource = EGameplayEffectAttributeCaptureSource::Target;  
    IntelligenceDef.bSnapshot = false;  
  
    RelevantAttributesToCapture.Add(IntelligenceDef);  
}
```

---
  
1. 系统讲解：MMC 的原理与使用方法
  
MMC 是什么？
MMC 是 GAS 中用于计算 Gameplay Effect Modifier 的数值逻辑的类（UAttributeSet 和 UGameplayEffect 的结合）。它允许开发者定义复杂的计算逻辑，比如基于角色的属性（如力量、智力）、当前状态（血量、Buff/Debuff）或其他动态数据来决定修饰器的强度。
  
•  Gameplay Effect Modifier：在 GAS 中，Gameplay Effect 是用来修改角色属性（如生命值、伤害、速度）的核心机制。每个 Modifier 有一个 Magnitude（量级），决定它对属性的影响程度。
•  MMC 的作用：当 Modifier 的 Magnitude 不是固定值，而是需要根据游戏逻辑动态计算时，就需要使用 MMC。MMC 是一个继承自 UGameplayModMagnitudeCalculation 的自定义类，开发者可以重写其 CalculateBaseMagnitude_Implementation 方法来实现自定义计算逻辑。
  
MMC 的工作流程
2. 定义 Gameplay Effect：在 Gameplay Effect 中，添加一个 Modifier，用于修改某个属性（比如增加生命值或伤害）。
3. 设置 Modifier 的 Magnitude：选择 Magnitude 类型为 Scalable Float（可扩展浮点数）并绑定一个 MMC 类。
4. 创建 MMC 类：继承 UGameplayModMagnitudeCalculation，实现自定义的计算逻辑。
5. 运行时计算：当 Gameplay Effect 被应用时，引擎会调用 MMC 的 CalculateBaseMagnitude_Implementation 方法，基于当前的游戏状态（如角色属性、环境变量）计算出 Modifier 的值。
6. 应用结果：计算出的值会影响目标属性（如增加 50 点生命值、减少 20% 移动速度）。
  
最佳实践
•  模块化设计：为不同类型的修饰器创建独立的 MMC 类，便于复用和维护。例如，一个 MMC 用于计算基于力量的物理伤害，另一个用于计算基于智力的魔法伤害。
•  性能优化：MMC 的计算可能频繁触发（如每帧或每次应用效果），确保逻辑高效，避免复杂运算或不必要的查询。
•  调试支持：在 MMC 中添加日志或调试信息，方便追踪计算结果是否符合预期。
•  结合 AttributeSet：MMC 通常需要访问角色的 UAttributeSet（属性集）来获取属性值，确保属性集设计合理，支持动态查询。
  
---
  
2. 对比说明：Unity 与虚幻引擎 GAS 中的 MMC
  
在 Unity 中，没有直接等价于 GAS 的系统，但我们可以将 MMC 的功能与 Unity 中常见的动态数值计算逻辑进行对比，帮助你理解从 Unity 到虚幻的迁移。
  

**方面**
**Unity**
**虚幻引擎 (GAS)**
**动态数值计算**
通常通过脚本（C#）手动实现。例如，基于角色属性计算伤害，可能在脚本中编写 `float damage = baseDamage * strength * multiplier;`
通过 MMC 提供标准化的框架，继承 `UGameplayModMagnitudeCalculation`，在 `CalculateBaseMagnitude_Implementation` 中实现逻辑。
**系统化程度**
开发者需要自己设计数值计算的架构，可能分散在多个脚本中，缺乏统一管理。
GAS 提供高度模块化的系统，MMC 集成在 Gameplay Effect 中，统一管理所有属性修改逻辑。
**复用性**
复用需要开发者手动封装为函数或组件，容易导致代码重复。
MMC 类天生支持复用，可以绑定到多个 Gameplay Effect，逻辑集中且易于维护。
**调试与可视化**
依赖 Unity 的调试工具（如 Debug.Log 或 Inspector），可视化程度较低。
虚幻提供 GAS 调试工具（如 `GASDocumentation` 或日志），可以直观查看效果和计算流程。
**工作流程**
更灵活但需要更多手动配置，可能涉及 MonoBehaviour 和组件间的通信。
更结构化，依赖蓝图或 C++ 配置 Gameplay Effect 和 MMC，减少手动编码的工作量。

从 Unity 迁移到 MMC 的建议
•  思维转变：在 Unity 中，你可能习惯通过脚本直接修改属性值（例如 player.health += 10）。在 GAS 中，属性修改必须通过 Gameplay Effect 和 Modifier，MMC 是动态计算 Modifier 值的工具。接受这种“声明式”设计会让你更快适应。
•  组件化对比：将 MMC 想象成 Unity 中的一个“数值计算组件”，但它更专注于属性修改，且与 GAS 的整体框架紧密集成。
•  学习曲线：GAS 的学习曲线比 Unity 的脚本系统更陡，但一旦掌握，你会发现它在处理复杂系统（如 RPG 的技能、Buff/Debuff）时更高效。
  
---
  
3. 示例代码与蓝图
  
以下是一个完整的 MMC 示例，展示如何创建一个基于角色力量属性的伤害计算 MMC，并结合蓝图和 C++ 实现。
  
场景描述
•  目标：创建一个 Gameplay Effect，增加角色的伤害输出，伤害值基于角色的 Strength 属性（假设 Strength 是 UAttributeSet 中的一个属性）。
•  逻辑：伤害增量 = Strength * 2 + 10（简单公式，仅作示例）。
  
步骤 1：创建 AttributeSet
确保你的角色有一个 UAttributeSet 类，包含 Strength 属性。
```cpp
// MyAttributeSet.h
#pragma once
#include "CoreMinimal.h"
#include "AttributeSet.h"
#includeMyAttributeSet.generated.h"

UCLASS()
class MYGAME_API UMyAttributeSet : public UAttributeSet
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintReadOnly)
    FGameplayAttributeData Strength;
    ATTRIBUTE_ACCESSORS(UMyAttributeSet, Strength)
};
  
// MyAttributeSet.cpp
#include "MyAttributeSet.h"
#include "GameplayEffectExtension.h"

void UMyAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)
{
    Super::PostGameplayEffectExecute(Data);
    // 可以在此处理属性修改后的逻辑
}
```
步骤 2：创建 MMC 类
创建一个继承自 UGameplayModMagnitudeCalculation 的 MMC 类，用于计算伤害增量。
```cpp
// DamageMMC.h
#pragma once
#include "CoreMinimal.h"
#include "GameplayModMagnitudeCalculation.h"
#include "DamageMMC.generated.h"

UCLASS()
class MYGAME_API UDamageMMC : public UGameplayModMagnitudeCalculation
{
    GENERATED_BODY()

public:
    virtual float CalculateBaseMagnitude_Implementation(const FGameplayEffectSpec& Spec) const override;
};
  
// DamageMMC.cpp
#include "DamageMMC.h"
#include "MyAttributeSet.h"
#include "GameplayEffect.h"

float UDamageMMC::CalculateBaseMagnitude_Implementation(const FGameplayEffectSpec& Spec) const
{
    // 获取 AttributeSet
    const UAttributeSet* AttributeSet = Spec.GetContext().GetInstigatorAttributeSet();
    const UMyAttributeSet* MyAttributes = Cast<UMyAttributeSet>(AttributeSet);

    if (MyAttributes
    {
        // 获取 Strength 属性值
        float Strength = MyAttributes->Strength.GetCurrentValue();
        // 计算伤害：Strength * 2 + 10
        float Damage = Strength * 2.0f + 10.0f;
        UE_LOG(LogTemp, Log, TEXT("Calculated Damage: %f (Strength: %f)"), Damage, Strength);
        return Damage;
    }

    // 如果无法获取属性，返回 0
    return 0.0f;
}
```
步骤 3：配置 Gameplay Effect
在虚幻编辑器中：
1. 创建一个新的 Gameplay Effect 资产（例如 GE_IncreaseDamage）。
2. 添加一个 Modifier：
  ◦  Attribute：选择 MyAttributeSet.Damage（假设 Damage 是要修改的属性）。
  ◦  Operation：选择 Add（加法操作）。
  ◦  Magnitude：选择 Scalable Float，并在 Calculation Type 中选择 Custom Calculation Class，绑定到 DamageMMC 类。
3. 配置 Gameplay Effect 的其他属性（如 Duration、Stacking 规则）。
  
步骤 4：蓝图实现
如果你更倾向于使用蓝图，可以通过蓝图节点调用 Gameplay Effect 和 MMC：
4. 在角色蓝图中，添加一个 Gameplay Ability，触发时应用 GE_IncreaseDamage。
5. 使用 Apply Gameplay Effect to Target 节点，将 Gameplay Effect 应用到角色。
6. MMC 的逻辑仍然在 C++ 中实现，但蓝图可以用来触发和调试效果。
  
步骤 5：测试
•  在游戏中，给角色的 Strength 属性设置不同值（例如 10、20）。
•  触发 Gameplay Effect，检查 Damage 属性是否按预期增加（例如 Strength = 10 时，Damage 增加 30；Strength = 20 时，Damage 增加 50）。
  
---
  
4. 深入指导：MMC 的高级技巧与底层原理
  
底层原理
•  FGameplayEffectSpec：MMC 的输入是一个 FGameplayEffectSpec 结构体，包含了 Gameplay Effect 的上下文信息（如发起者、目标、属性集）。通过它可以访问动态数据。
•  Attribute Capture：MMC 可以通过 CaptureAttribute 机制动态捕获属性值（无需硬编码）。在 Gameplay Effect 中，可以配置哪些属性需要捕获，MMC 会自动获取这些属性的当前值。
•  线程安全：MMC 的计算通常在游戏线程执行，但如果你涉及复杂的异步操作（例如查询服务器数据），需要确保线程安全。
  
高级技巧
5. 动态属性捕获：
  ◦  在 MMC 中，可以通过 GetCapturedAttributeMagnitude 获取动态捕获的属性值。例如：
     `cpp
     float Strength = GetCapturedAttributeMagnitude(StrengthAttribute, Spec, 0.0f);
     `
  ◦  这允许 MMC 更灵活地处理不同角色的属性。
  
6. 组合多个属性：
  ◦  例如，计算伤害时结合 Strength 和 Dexterity：
     `cpp
     float Strength = GetCapturedAttributeMagnitude(StrengthAttribute, Spec, 0.0f);
     float Dexterity = GetCapturedAttributeMagnitude(DexterityAttribute, Spec, 0.0f);
     return (Strength * 1.5f + Dexterity * 0.5f) + 10.0f;
     `
  
7. 条件逻辑：
  ◦  可以在 MMC 中添加条件逻辑，例如只有在特定 Buff 存在时才增加伤害：
     `cpp
     if (Spec.GetContext().GetInstigator()->HasTag(FGameplayTag::RequestGameplayTag(TEXT("Buff.CriticalStrike"))))
     {
         return Damage * 2.0f; // 双倍伤害
     }
     return Damage;
     `
  
8. 优化性能：
  ◦  缓存频繁访问的数据（如 AttributeSet 指针）。
  ◦  避免在 MMC 中执行昂贵的操作（如复杂的物理查询）。
  
常见问题与解决方案
•  问题：MMC 返回值为 0。
  ◦  原因：可能是 AttributeSet 未正确绑定，或属性未初始化。
  ◦  解决：确保角色拥有正确的 UAttributeSet 组件，并在 MMC 中添加日志检查属性值。
•  问题：MMC 计算结果不一致。
  ◦  原因：可能是属性值被其他 Gameplay Effect 修改。
  ◦  解决：使用 GAS 调试工具查看属性修改的堆栈，检查是否有冲突的 Gameplay Effect。
  
---
  
5. 资源推荐
•  官方文档：
  ◦  Gameplay Ability System Documentation：官方对 GAS 的全面介绍，包括 MMC 的用法。
  ◦  UGameplayModMagnitudeCalculation API Reference：MMC 类的详细 API。
•  学习资源：
  ◦  Unreal Slackers Discord：虚幻引擎社区，GAS 相关讨论活跃，可以直接向专家提问。
  ◦  YouTube 教程：搜索“Unreal Engine GAS Tutorial”，推荐 Tom Looman 或 Unreal Engine 官方频道的 GAS 系列。
  ◦  GitHub 项目：查看开源项目如 Action RPG Sample 或 GASDocumentation，包含大量 GAS 示例。
•  书籍：
  ◦  《Unreal Engine 5 Game Development with C++ Scripting》：涵盖 GAS 和 C++ 的高级用法。
  ◦  《Mastering Unreal Engine 5》：包含蓝图和 GAS 的实用案例。
  
---
  
总结
MMC 是 GAS 中动态计算 Modifier 量级的核心工具，适合处理复杂、基于属性的数值逻辑。相比 Unity 的手动脚本实现，MMC 提供了更结构化、可复用的框架，但需要适应 GAS 的声明式。通过提供的 C++ 示例和蓝图配置，你可以快速上手 MMC 的开发。深入掌握 MMC 的动态属性捕获、条件逻辑和性能优化技巧，将帮助你在虚幻引擎中构建高效的游戏系统。
  
如果有具体场景或问题（例如实现某个特定的 Modifier 逻辑），请进一步说明，我可以提供更针对性的代码或蓝图示例！