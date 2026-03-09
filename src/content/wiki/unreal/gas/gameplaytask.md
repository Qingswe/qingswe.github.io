---
title: GameplayTask & AbilityTask - 游戏任务与能力任务
description: GameplayTask 与 AbilityTask 用于组织能力中的异步执行流程。
tags: [unreal, gas, wiki, gameplay-task, async]
updated: 2025-04-17
---

# GameplayTask & AbilityTask - 游戏任务与能力任务

【重点】`UGameplayTask` 是 Unreal Engine 中用于管理**异步、长时间运行操作**的基础类。它提供了一种结构化的方式来处理需要等待（例如，等待事件、等待延迟、等待动画完成）的逻辑，而不会阻塞游戏主线程。

在 Gameplay Ability System (GAS) 中，我们通常使用其子类 `UAbilityTask`。 `UAbilityTask` 专为在 [[w/unreal/gas/gameplayability|GameplayAbility]] 内部使用而设计，并与 [[w/unreal/gas/asc|ASC]] 和能力生命周期紧密集成。

---

## UGameplayTask 核心概念

*   **异步执行**: Task 允许你启动一个操作，然后在未来的某个时间点（当特定条件满足时）得到通知。
*   **生命周期管理**: Task 自身管理其状态（等待、完成、取消）。
*   **所有者 (Owner)**: 每个 Task 都与一个 `IGameplayTaskOwnerInterface` 相关联（通常是 [[w/unreal/gas/asc|ASC]] 或 Controller）。
*   **优先级 (Priority)**: 可以为 Task 设置优先级，用于资源竞争（如同时只有一个 Task 能控制 AI 移动）。
*   **资源管理 (Resource Management)**: 可以声明 Task 需要的资源（如 `GameplayTaskResource`），系统可以根据优先级仲裁资源分配。

---

## UAbilityTask (Ability Task - 能力任务)

【重点】`UAbilityTask` 是 `UGameplayTask` 的子类，专门用于 [[w/unreal/gas/gameplayability|GameplayAbility]] 内部。它简化了在能力中执行异步操作的流程。

*   **能力绑定**: AbilityTask 强绑定到创建它的 [[w/unreal/gas/gameplayability|GameplayAbility]] 实例。
*   **自动生命周期**: 当 [[w/unreal/gas/gameplayability|GameplayAbility]] 结束时，它创建的所有 AbilityTask 通常也会被自动清理。
*   **委托回调**: AbilityTask 通常暴露多个 `FGameplayAbilityTaskDelegate` 委托（如 `OnComplete`, `OnCancelled`, `OnEventReceived`），能力可以通过这些委托响应任务的不同结果。
*   **简化创建**: [[w/unreal/gas/gameplayability|GameplayAbility]] 提供了方便的静态工厂方法来创建和激活常见的 AbilityTask（例如 `UAbilityTask_WaitDelay::WaitDelay`）。

### 常见 AbilityTask 示例

*   `[[w/unreal/abilitytask_waitdelay|AbilityTask_WaitDelay]]`: 等待指定的时间。
*   `[[w/unreal/abilitytask_waitgameplayevent|AbilityTask_WaitGameplayEvent]]`: 等待特定的 [[w/unreal/gameplay-events|Gameplay Event Tag]] 被发送到 [[w/unreal/gas/asc|ASC]]。
*   `[[w/unreal/abilitytask_playmontageandwait|AbilityTask_PlayMontageAndWait]]`: 播放 [[w/unreal/gas/montage|Montage]] 动画，并在动画结束、中断或触发特定 [[w/unreal/gas/montageevent|MontageEvent]] 时回调。
*   `[[w/unreal/abilitytask_waittargetdata|AbilityTask_WaitTargetData]]`: 等待玩家或 AI 提供目标数据（[[w/unreal/gas/fgameplayabilitytargetdata|FGameplayAbilityTargetData]]）。常用于需要选择目标点的技能。
*   `[[w/unreal/abilitytask_movetolocation|AbilityTask_MoveToLocation]]`: 将 AI 控制的角色移动到指定位置。
*   `[[w/unreal/abilitytask_waitattributechange|AbilityTask_WaitAttributeChange]]`: 等待某个 [[w/unreal/attributeset|Attribute]] 的值满足特定条件。
*   `[[w/unreal/abilitytask_waitinputpress|AbilityTask_WaitInputPress]]`/`[[w/unreal/abilitytask_waitinputrelease|AbilityTask_WaitInputRelease]]`: 等待特定的输入 Action 被按下或释放。

### 如何在能力中使用 AbilityTask

1.  **创建任务**: 在 [[w/unreal/gas/gameplayability|GameplayAbility]] 的 `ActivateAbility` 函数中，调用任务的静态工厂方法创建实例。
    ```cpp
    // 示例：创建一个等待延迟的任务
    UAbilityTask_WaitDelay* WaitDelayTask = UAbilityTask_WaitDelay::WaitDelay(this, /*WaitTime*/ 2.0f);
    ```
2.  **绑定委托**: 将能力的成员函数绑定到任务的回调委托上。
    ```cpp
    WaitDelayTask->OnFinish.AddDynamic(this, &UMyGameplayAbility::OnDelayFinished);
    ```
3.  **激活任务**: 调用任务的 `ReadyForActivation()` 方法。**【注意】这是必需步骤！** 否则任务不会开始执行。
    ```cpp
    WaitDelayTask->ReadyForActivation();
    ```
4.  **处理回调**: 在绑定的委托函数（如 `OnDelayFinished`）中编写后续逻辑，例如应用 [[w/unreal/gas/gameplayeffect|GameplayEffect]] 或调用 `EndAbility`。

```cpp
void UMyGameplayAbility::OnDelayFinished()
{
    // 延迟结束后执行的操作
    ApplyEffectToTarget();
    EndAbility(CurrentSpecHandle, CurrentActorInfo, CurrentActivationInfo, true, false);
}
```

---

## 重要概念链接

*   [[w/unreal/gas/gameplayability|GameplayAbility]]：AbilityTask 的主要使用者和创建者。
*   [[w/unreal/gas/asc|ASC]]：通常是 AbilityTask 的所有者。
*   [[w/unreal/gas/montage|Montage]]：常与 `AbilityTask_PlayMontageAndWait` 配合使用。
*   [[w/unreal/gameplay-events|Gameplay Events]]：`AbilityTask_WaitGameplayEvent` 监听的目标。
*   [[w/unreal/gas/fgameplayabilitytargetdata|FGameplayAbilityTargetData]]：`AbilityTask_WaitTargetData` 等待的数据类型。

---

## 注意事项

*   【注意】只有**实例化**（Instanced Per Actor 或 Instanced Per Execution）的 [[w/unreal/gas/gameplayability|GameplayAbility]] 才能使用 AbilityTask。
*   【注意】务必在创建任务后调用 `ReadyForActivation()`。
*   【注意】在任务的回调函数中，通常需要根据情况调用 [[w/unreal/gas/gameplayability|GameplayAbility]] 的 `EndAbility` 来正确结束能力。
*   【技巧】一个能力可以同时运行多个 AbilityTask，用于处理并行逻辑。