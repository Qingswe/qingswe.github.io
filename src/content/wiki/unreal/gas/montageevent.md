---
title: MontageEvent - 蒙太奇事件
description: MontageEvent 通过 Notify 和 GameplayTag 驱动动画事件同步。
tags: [unreal, gas, wiki, montage-event, animation]
updated: 2025-04-18
---

# MontageEvent - 蒙太奇事件

【重点】Montage 事件允许你在 [[w/unreal/gas/montage|Montage]] 动画播放到特定帧或时间段时，向 Gameplay Ability System 发送一个信号。这常用于**精确同步动画表现和游戏逻辑**，例如在角色挥剑动画的击中帧应用伤害效果。

实现 Montage 事件的标准方式是结合使用 **AnimNotifies** 和 **Gameplay Event Tags**。

---

## 实现流程

1.  **创建 AnimNotify**: 在 [[w/unreal/gas/montage|Montage]] 编辑器的时间轴上，右键点击 `Notifies` 轨道，选择添加 `AnimNotify` 或 `AnimNotifyState`。
    *   `AnimNotify`: 在单个时间点触发。
    *   `AnimNotifyState`: 在一个时间段内持续触发（有开始、持续、结束）。
    *   【技巧】可以创建自定义的 C++ 或蓝图 AnimNotify 类来携带更复杂的逻辑或数据，但对于简单的事件触发，通常使用内置的或与 GAS 集成的 Notify。

2.  **关联 Gameplay Event Tag**: 最常用的方法是使用 `AnimNotify_SendGameplayEvent` (蓝图) 或其 C++ 等效物。在这个 Notify 的细节面板中，设置一个 **`EventTag`** 属性，选择一个 [[w/unreal/gameplay-tags|Gameplay Tag]] (例如 `Event.Montage.AttackHit`)。
    *   【重点】这个 `EventTag` 就是 [[w/unreal/gas/gameplayability|GameplayAbility]] 中用来监听事件的标识符。

3.  **监听事件**: 在播放该 [[w/unreal/gas/montage|Montage]] 的 [[w/unreal/gas/gameplayability|GameplayAbility]] 中，使用 `[[w/unreal/abilitytask_playmontageandwait|AbilityTask_PlayMontageAndWait]]` 或 `[[w/unreal/abilitytask_waitgameplayevent|AbilityTask_WaitGameplayEvent]]` 来监听这个 `EventTag`。

    *   **使用 `AbilityTask_PlayMontageAndWait`**: (推荐用于与特定 Montage 强相关的事件)
        ```cpp
        // 在绑定委托时：
        PlayMontageTask->EventReceived.AddDynamic(this, &UMyGameplayAbility::OnMontageEventReceived);

        // 回调函数：
        void UMyGameplayAbility::OnMontageEventReceived(FGameplayTag EventTag, FGameplayEventData EventData)
        {
            if (EventTag == FGameplayTag::RequestGameplayTag(FName("Event.Montage.AttackHit")))
            {
                // 处理攻击命中的逻辑，例如应用伤害 GameplayEffect
                ApplyDamageToTarget(EventData);
            }
        }
        ```

    *   **使用 `AbilityTask_WaitGameplayEvent`**: (适用于监听任何来源的 Gameplay Event，不局限于某个 Montage)
        ```cpp
        // 创建任务
        UAbilityTask_WaitGameplayEvent* WaitEventTask = UAbilityTask_WaitGameplayEvent::WaitGameplayEvent(
            this, 
            FGameplayTag::RequestGameplayTag(FName("Event.Montage.AttackHit")), 
            nullptr, // Optional External Target
            true // Only Trigger Once
        );

        // 绑定委托
        WaitEventTask->EventReceived.AddDynamic(this, &UMyGameplayAbility::OnGameplayEventReceived);

        // 激活任务
        WaitEventTask->ReadyForActivation();

        // 回调函数
        void UMyGameplayAbility::OnGameplayEventReceived(FGameplayEventData Payload)
        {
            // 处理事件逻辑
            ApplyDamageToTarget(Payload);
            // 可能需要结束任务或能力
        }
        ```

4.  **[[w/unreal/payload|GameplayEventData]] (事件数据)**: 【重点】当事件被触发时，系统会传递一个 `FGameplayEventData` 结构体作为[[w/unreal/payload|Payload]]。这个结构体可以包含额外的信息：
    *   `Instigator`: 事件的发起者 (通常是拥有 [[w/unreal/gas/asc|ASC]] 的 Actor)。
    *   `Target`: 事件的目标 Actor。
    *   `OptionalObject`/`OptionalObject2`: 可以传递任意 UObject 指针。
    *   `ContextHandle`: [[w/unreal/gas/effectcontext|EffectContext]] 句柄，传递效果相关的上下文信息。
    *   `InstigatorTags`/`TargetTags`: 发起者和目标当前的 [[w/unreal/gameplay-tags|Gameplay Tags]]。
    *   `EventMagnitude`: 一个浮点数，可以传递数值信息（例如，伤害系数）。
    *   `TargetData`: 【技巧】可以传递更复杂的目标信息 [[w/unreal/gas/fgameplayabilitytargetdata|FGameplayAbilityTargetData]]。

    【技巧】你可以在 `AnimNotify_SendGameplayEvent` 中直接设置 `Payload` 的部分内容，或者在发送事件的代码（如 C++ Notify）中手动构建 `FGameplayEventData`。

---

## 重要概念链接

*   [[w/unreal/gas/montage|Montage]]：事件的载体。
*   [[w/unreal/gas/gameplayability|GameplayAbility]]：事件的监听者和处理者。
*   `[[w/unreal/abilitytask_playmontageandwait|AbilityTask_PlayMontageAndWait]]` / `[[w/unreal/abilitytask_waitgameplayevent|AbilityTask_WaitGameplayEvent]]`：监听事件的任务。
*   [[w/unreal/gameplay-tags|Gameplay Tags]]：识别事件的标签。
*   [[w/unreal/payload|GameplayEventData]]：事件传递的数据。
*   [[w/unreal/gas/asc|ASC]]：Gameplay Event 通常发送给 ASC。

---

## 注意事项

*   【注意】确保 `AnimNotify` 使用的 `EventTag` 与 [[w/unreal/gas/gameplayability|GameplayAbility]] 中监听的 `EventTag` 完全匹配。
*   【技巧】合理规划你的 Gameplay Event Tag 体系（例如 `Event.Montage.AbilityName.Action`），使其清晰易懂。
*   【注意】`AnimNotifyState` 会在每一帧、开始和结束时都尝试发送事件（如果配置如此），确保你的接收逻辑能正确处理这种情况，或者只在 `NotifyBegin` 或 `NotifyEnd` 中发送事件。
*   【技巧】`FGameplayEventData` 的 `TargetData` 非常强大，可以传递复杂的目标选择结果（如球体范围内的所有敌人），但这通常在 C++ 中手动构建和发送。