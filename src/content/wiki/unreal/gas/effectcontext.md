---
title: EffectContext
description: GameplayEffectContext 用于携带效果来源、命中信息和自定义上下文。
tags: [Unreal, GAS]
updated: 2025-04-22
---

在虚幻引擎的 Gameplay Ability System (GAS) 中，GameplayEffectContext 是一个关键组件，用于在 Gameplay Effect (GE) 应用时传递和存储与效果相关的上下文信息。它本质上是一个数据容器，包含了有关效果来源、目标、触发条件以及其他元数据的详细信息，帮助系统决定如何处理和应用效果。
  
由于你是Unity背景的开发者，我会从以下几个方面详细讲解 GameplayEffectContext 的作用、原理和使用方式，同时对比Unity的类似机制，辅以示例代码和蓝图说明，并探讨其底层设计与高级用法。

一个EffectContext拥有一个actors数组，可以因任何原因被设置

当中的变量都是弱引用，因为上下文并不一定在所有情况下都由垃圾回收追踪

---
### GetScriptStruct
一个虚函数，可由子类实现，返回[[w/unreal/script-struct|Script Struct]]的StaticStruct
### NetSerialize
```cpp
/** Custom serializer, handles polymorphism of context */  
bool NetSerialize(FArchive& Ar, class UPackageMap* Map, bool& bOutSuccess);
```

虚函数，自定义序列化的子类必须重写该方法
决定了这个结构如何被序列化，如果想要保存该数据或者通过网络发送，就需要序列化.
作用就是将这个结构体里的每个成员变量进行序列化，保存进 `FArchive` 中
  
---
  
一、GameplayEffectContext核心概念
  
GameplayEffectContext 是 GAS 中用于跟踪 Gameplay Effect 应用时上下文的结构。它通常包含以下信息：
  
1. 来源 (Instigator)：触发或施加效果的实体（例如玩家角色、NPC、环境物体）。
2. 目标 (Target)：效果应用的目标对象（例如另一个角色、物体）。
3. 能力 (Ability)：触发该效果的 Gameplay Ability（如果有）。
4. 附加数据：自定义数据，例如击中位置、伤害类型、效果强度等。
5. 传播路径：效果如何从来源传播到目标（例如通过物理碰撞、范围检测等）。
  
在 GAS 的设计中，GameplayEffectContext 确保效果的执行具有足够的灵活性和可扩展性。它允许开发者在效果应用时动态调整行为，而无需硬编码逻辑。
  
与 Unity 的对比
在 Unity 中，类似的功能可能通过 ScriptableObject、自定义组件或事件系统实现。例如，Unity 开发者可能通过一个 DamageData 类来传递伤害相关的上下文信息（来源、目标、伤害值等）。但 Unity 的方法通常是手动实现的，缺乏 GAS 这样统一的框架。GAS 的 GameplayEffectContext 是引擎内置的、标准化的上下文传递机制，集成在整个 Ability System 中，减少了开发者重复造轮子的需求。
  
关键差异：
•  Unity：上下文数据通常由开发者自行定义，分散在不同脚本中，缺乏统一管理。
•  虚幻 GAS：GameplayEffectContext 是 GAS 的核心部分，与 Ability、Attribute、Gameplay Effect 紧密集成，提供了开箱即用的上下文管理。
•  Unity 的实现更灵活但需要更多手动配置，而 GAS 的上下文系统更结构化，适合复杂系统。
  
---
  
二、GameplayEffectContext 的工作原理
  
GameplayEffectContext 通常作为 FGameplayEffectContext 结构体的一部分，存储在 FGameplayEffectSpec 中。以下是它的工作流程：
  
1. 创建上下文：
   当一个 Gameplay Effect 被触发时（例如通过 Ability 或直接调用），系统会创建一个 FGameplayEffectSpec，并为其分配一个 FGameplayEffectContext。上下文会记录触发时的相关信息，例如：
  ◦  谁是 Instigator（施加者）？
  ◦  目标是哪个 Actor？
  ◦  是否通过命中结果（Hit Result）触发？
  
2. 传递上下文：
   上下文会随着效果的传播（例如从客户端到服务器，或从一个 Actor 到另一个 Actor）一起传递。GAS 的网络同步机制确保上下文在多人游戏中一致。
  
3. 使用上下文：
   在效果执行时，开发者可以通过上下文访问详细信息。例如，在计算伤害时，可以根据上下文中的来源 Actor 或命中位置调整伤害值。
  
4. 扩展上下文：
   开发者可以继承 FGameplayEffectContext，添加自定义数据（例如特定的伤害类型、状态效果标记等）。
  
底层实现
FGameplayEffectContext 是一个轻量级结构体，定义在 GameplayEffectTypes.h 中。其核心字段包括：
```cpp
class FGameplayEffectContext
{
public:
    TWeakObjectPtr<AActor> Instigator; // 效果的施加者
    TWeakObjectPtr<AActor> Target;     // 效果的目标
    TWeakObjectPtr<UGameplayAbility> Ability; // 触发效果的能力
    FHitResult HitResult;              // 命中结果（可选）
    bool bHasWorldOrigin;              // 是否包含世界坐标原点
    FVector WorldOrigin;               // 效果的触发位置
    // 其他字段...
};
```
开发者可以通过重写 FGameplayEffectContext 或使用 FGameplayEffectContextHandle 来操作上下文。
  
---
  
三、实际使用场景与示例
  
以下是通过蓝图和 C++ 使用 GameplayEffectContext 的实际示例，展示如何在实践中操作上下文。
  
场景：动态调整伤害效果
假设你想实现一个 Gameplay Effect，根据攻击者的位置（例如是否在目标背后）动态调整伤害值。GameplayEffectContext 可以用来传递攻击者的位置信息。
  
1. C++ 示例
首先，扩展 FGameplayEffectContext 以存储自定义数据：
```cpp
// MyGameplayEffectContext.h
USTRUCT(BlueprintType)
struct FMyGameplayEffectContext : public FGameplayEffectContext
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintReadWrite)
    bool bIsBackstab; // 是否为背刺

    virtual UScriptStruct* GetScriptStruct() const override
    {
        return FMyGameplayEffectContext::StaticStruct();
    }

    virtual FGameplayEffectContext* Duplicate() const override
    {
        FMyGameplayEffectContext* NewContext = new FMyGameplayEffectContext();
        *NewContext = *this;
        return NewContext;
    }

    virtual bool NetSerialize(FArchive& Ar, UPackageMap* Map, bool& bOutSuccess) override
    {
        bool Result = Super::NetSerialize(Ar, Map, bOut);
        Ar << bIsBackstab;
        return Result;
    }
};

// 注册自定义上下文
UCLASS()
class UMyAbilitySystemComponent : public UAbilitySystemComponent
{
    GENERATED_BODY()

public:
    virtual FGameplayEffectContext* MakeEffectContext(const FGameplayEffectSpec& Spec, const FGameplayEffectContextHandle& Handle) const override
    {
        return new FMyGameplayEffectContext();
    }
};
然后，在 Gameplay Ability 中设置上下文：
void AMyGameplayAbility::ActivateAbility(const FGameplayAbilitySpecHandle Handle, const FGameplayAbilityActorInfo* ActorInfo, const FGameplayAbilityActivationInfo ActivationInfo, const FGameplayEventData* TriggerEventData)
{
    // 创建 Gameplay Effect Spec
    UGameplayEffect* DamageEffect = NewObject<UGameplayEffect>(GetTransientPackage(), FName(TEXT("DamageEffect")));
    DamageEffect->Modifiers.Add(FGameplayModifierInfo());
    FGameplayEffectSpecHandle EffectSpec = MakeOutgoingSpec(DamageEffect, 1.0f, MakeEffectContext());

    // 设置自定义上下文
    FMyGameplayEffectContext* Context = static_cast<FMyGameplayEffectContext*>(EffectSpec.Data->GetContext().Get());
    AActor* Target = GetAvatarActorFromActorInfo();
    AActor* Instigator = ActorInfo->AvatarActor.Get();
    FVector RelativeDirection = (Target->GetActorLocation() - Instigator->GetActorLocation()).GetSafeNormal();
    FVector TargetForward = Target->GetActorForwardVector();
    Context->bIsBackstab = FVector::DotProduct(RelativeDirection, TargetForward) < -0.5f; // 判断是否背刺

    // 应用效果
    ApplyGameplayEffectSpecToTarget(Handle, ActorInfo, EffectSpec);
}
```
在 Gameplay Effect Execution Calculation 中读取上下文：
```cpp
UCLASS()
class UMyDamageExecution : public UGameplayEffectExecutionCalculation
{
    GENERATED_BODY()

public:
    virtual void Execute_Implementation(const FGameplayEffectCustomExecutionParameters& ExecutionParams, FGameplayEffectCustomExecutionOutput& OutExecutionOutput) const override
    {
        FGameplayEffectContextHandle Context = ExecutionParams.GetSourceAbilitySystemComponent()->GetEffectContext();
        FMyGameplayEffectContext* MyContext = static_cast<FMyGameplayEffectContext*>(Context.Get());

        float BaseDamage = 10.0f;
        if (MyContext->bIsstab)
        {
            BaseDamage *= 20f; // 背刺双倍伤害
        }

        OutExecution.AddOutputModifier(FGameplayModifierEvaluatedData(FGameplayAttribute(), EGameplayModOp::Additive, BaseDamage));
    }
};
```
2. 蓝图示例
在蓝图中，操作 GameplayEffectContext 通常通过 Gameplay Effect Spec 节点完成：
  
3. 创建一个 Gameplay Ability 蓝图。
4. 使用 Make Gameplay Effect Spec 节点创建效果规格。
5. 使用 Set Gameplay Effect Context 节点设置上下文信息（例如 Instigator、Target）。
6. 在 Execution Calculation 蓝图中，通过 Get Gameplay Effect Context 节点访问上下文，并根据条件调整效果。
  
蓝图步骤：
•  创建效果：拖入 Make Gameplay Effect Spec 节点，指定 Gameplay Effect 类。
•  设置上下文：使用 Set Effect Context 节点，设置 Instigator 和 Target。
•  应用效果：通过 Apply Gameplay Effect Spec to Target 节点将效果应用到目标。
•  读取上下文：在 Execution Calculation 蓝图中，使用 Get Effect Context 节点，检查上下文中的字段（需要自定义上下文时，需先用 C++ 扩展）。
  
---
  
四、与 Unity 的进一步对比
  
在 Unity 中，类似的功能可能通过以下方式实现：
•  事件系统：通过 UnityEvent 或自定义委托传递上下文数据。
•  组件化设计：将上下文数据存储在 MonoBehaviour 组件中，目标对象通过 GetComponent 访问。
•  ScriptableObject：用 ScriptableObject 存储效果的元数据，类似于 GAS 的 Gameplay Effect。
  
GAS 的优势：
•  统一性GameplayEffectContext 集成在 GAS 中，与 Ability、Attribute、Effect 无缝协作。
•  网络支持：上下文数据自动支持网络同步，适合多人游戏。
•  扩展性：通过继承和自定义，上下文可以轻松扩展。
  
Unity 的优势：
•  灵活性：开发者可以完全自由设计上下文数据结构。
•  简单性：对于小型项目，Unity 的手动实现更直观。
  
---
  
五、高级技巧与最佳实践
  
1. 自定义上下文的序列化：
   在多人游戏中，确保自定义上下文数据支持网络序列化（如上例中的 NetSerialize）。这需要正确实现序列化逻辑以保证客户端和服务器同步。
  
2. 性能优化：
  ◦  尽量保持上下文数据轻量，避免存储过多的冗余信息。
  ◦  使用 FGameplayEffectContextHandle 管理上下文，避免直接操作结构体导致内存问题。
  
3. 调试上下文：
   使用 Print String 节点或日志输出上下文信息，帮助调试效果的来源和目标。例如：

```cpp
   UE_LOG(LogTemp, Log, TEXT("Instigator: %s, Target: %s, IsBackstab: %d"), *GetNameSafe(Context->Instigator.Get()), *GetNameSafe(Context->Target.Get()), Context->bIsBackstab);
   ```

  
4. 动态上下文修改：
   在某些情况下，你可能需要在效果传播过程中动态修改上下文。例如，在 AOE（范围效果）中，可以根据目标距离调整上下文中的伤害倍率。
  
---
  
六、资源推荐
  
1. 官方文档：
  ◦  Unreal Engine Gameplay Ability System Documentation
  ◦  FGameplayEffectContext 源码
  
2. 社区资源：
  ◦  GAS Documentation Project：由社区维护的 GAS 指南，GitHub 上有详细教程。
  ◦  Unreal Slackers Discord：虚幻引擎开发者社区，有专门的 GAS 讨论频道。
  
3. 学习课程：
  ◦  Udemy 的《Unreal Engine Gameplay Ability System》课程。
  ◦  Epic Games 的官方 YouTube 频道，有 GAS 相关讲座。
  
4. 示例项目：
  ◦  Epic 的 Action RPG 示例项目，包含 GAS 的完整实现。
  ◦  GitHub 上的开源 GAS 项目，例如 GASShooter。
  
---
  
七、总结与答疑引导
  
GameplayEffectContext 是 GAS 中用于传递效果上下文的核心机制，类似于 Unity 中的自定义数据结构，但更结构化和集成化。它通过存储来源、目标、命中信息等数据，为 Gameplay Effect 的灵活应用提供了支持。结合 C++ 和蓝图，开发者可以轻松扩展上下文以满足复杂需求。