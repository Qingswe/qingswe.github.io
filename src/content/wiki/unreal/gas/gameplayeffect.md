---
title: GameplayEffect (GE)
description: GameplayEffect 描述属性修改、持续时间与标签变化等效果配置。
tags: [unreal, gas, wiki, gameplay-effect, effect]
updated: 2025-04-23
---

# GameplayEffect (GE)

`GameplayEffect` 是 GAS 中负责“声明效果”的资产类型。

它本身不写技能流程，而是描述：

- 要修改哪些属性
- 修改值如何计算
- 持续时间和周期
- 是否授予或移除 `GameplayTag`
- 堆叠、免疫、应用条件等规则

## 和 GameplayAbility 的区别

- [[w/unreal/gas/gameplayability|GameplayAbility]]：决定什么时候触发、由谁触发、触发时做什么
- `GameplayEffect`：决定生效后具体改什么、持续多久、如何叠加

一个常见组合是：

1. `GameplayAbility` 被输入或事件激活
2. 能力内部创建 `GameplayEffectSpec`
3. 通过 ASC 把效果应用到自己或目标

## 运行时形态

编辑器里配置的是 `UGameplayEffect` 类定义，真正运行时参与计算的是 [[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]]。

`Spec` 会把下面这些信息组合到一起：

- GE 类本身的静态配置
- 等级
- [[w/unreal/gas/effectcontext|EffectContext]]
- 动态设置的 SetByCaller 数值
- 捕获到的属性和标签

## GameplayEffect 常见关注点

### Duration Policy

- `Instant`：立刻结算，常用于瞬时伤害或治疗
- `Duration`：持续一段时间
- `Infinite`：常驻，直到被显式移除

### Modifiers

用于声明属性如何变化，数值来源可能是：

- 固定值
- `SetByCaller`
- [[w/unreal/gas/mmc|MMC]]
- [[w/unreal/gas/execution-calculation|Execution Calculation]]

### Tags

GE 经常配合标签来做状态控制，例如：

- 施加 `Debuff.Stun`
- 阻止某些能力激活
- 作为免疫或触发条件

## 继续阅读

- [[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]]
- [[w/unreal/gas/applygameplayeffecttoself|ApplyGamePlayEffectToSelf]]
- [[w/unreal/gas/mmc|MMC]]
- [[w/unreal/gas/execution-calculation|Execution Calculation]]
    *   添加/移除标签 (`AddGameplayTag`, `RemoveGameplayTag`)。
    *   【技巧】监听标签变化 (`RegisterGameplayTagEvent`)：当特定标签被添加或移除时触发回调。这对于状态机或触发器非常有用。
    *   检查标签存在性 (`HasMatchingGameplayTag`, `HasAllMatchingGameplayTags`, `HasAnyMatchingGameplayTags`)。

5.  **能力任务 (Ability Tasks)**
    *   【注意】ASC 负责管理由 [[w/unreal/gas/gameplayability|GameplayAbility]] 创建的 [[w/unreal/gas/abilitytask|AbilityTask]] 实例的生命周期。

6.  **网络同步 (Replication)**
    *   【重点】ASC 内置了对属性、标签和效果激活的网络复制支持。需要正确设置 Actor 和 Component 的复制策略。
    *   支持 [[w/unreal/gas/gas-prediction|预测 (Prediction)]]，以减少网络延迟带来的影响。

---

## 如何获取 ASC

通常有几种方式获取目标 Actor 的 ASC：

1.  **直接附加**: 如果 ASC 直接附加在 Actor 上（如 Character），可以直接获取：
    ```cpp
    UAbilitySystemComponent* ASC = GetAbilitySystemComponent(); // AActor 类的方法
    // or
    UAbilitySystemComponent* ASC = FindComponentByClass<UAbilitySystemComponent>();
    ```
2.  **通过接口**: 实现 `IAbilitySystemInterface` 接口，通常在 Character 或 PlayerState 中实现 `GetAbilitySystemComponent()` 方法。这是**推荐**的方式，因为它提供了统一的访问点。
    ```cpp
    // 在实现了接口的类内部
    virtual UAbilitySystemComponent* GetAbilitySystemComponent() const override { return AbilitySystemComponent; }

    // 从其他地方获取
    IAbilitySystemInterface* ASI = Cast<IAbilitySystemInterface>(TargetActor);
    if (ASI)
    {
        UAbilitySystemComponent* ASC = ASI->GetAbilitySystemComponent();
    }
    ```
3.  **通过 PlayerState**: 在多人游戏中，ASC 常常放在 `PlayerState` 上，因为它在客户端和服务端都存在且与玩家生命周期绑定。
    ```cpp
    APlayerState* PS = GetPlayerState();
    if (PS)
    {
        IAbilitySystemInterface* ASI = Cast<IAbilitySystemInterface>(PS);
        if (ASI)
        {
            UAbilitySystemComponent* ASC = ASI->GetAbilitySystemComponent();
        }
    }
    ```

---

## 重要概念链接

*   [[w/unreal/attributeset|AttributeSet]]：属性集的具体实现。
*   [[w/unreal/gas/gameplayability|GameplayAbility]]：定义能力的蓝图或 C++ 类。
*   [[w/unreal/gas/gameplayeffect|GameplayEffect]]：定义属性修改或状态效果的蓝图或 C++ 类。
*   [[w/unreal/gameplay-tags|Gameplay Tags]]：用于状态管理和逻辑判断的标签系统。
*   [[w/unreal/gas/gas-prediction|预测]]：处理网络延迟的技术。
*   [[w/unreal/gas/abilitytask|AbilityTask]]：能力中执行异步操作的节点。
*   [[w/unreal/gas/metaattributes|MetaAttributes]]

---

## 常见问题与注意点

*   【注意】确保 ASC 和相关的 `AttributeSet` 被正确初始化和注册。
*   【注意】在多人游戏中，理解 ASC 的所有权（通常是服务器）和复制策略至关重要。客户端不能直接修改服务器上的属性或随意激活能力（除非使用预测）。
*   【技巧】利用 `GameplayEffectContext` 传递额外信息（如伤害来源、暴击标记）。见 [[w/unreal/gas/effectcontext|EffectContext]]。