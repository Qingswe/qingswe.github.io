---
title: AbilityTask
description: AbilityTask 用于在 GameplayAbility 中组织异步等待与回调流程。
tags: [Unreal, GAS]
updated: 2025-04-18
---

【重点】`UAbilityTask` 是在 `GameplayAbility` 中执行**异步操作**（如等待动画完成、等待网络事件、等待延迟）的专用类。

*   【技巧】能力任务使得复杂的、包含等待状态的能力逻辑可以用类似于状态机的方式编写，而不会阻塞游戏线程。
*   常见的任务包括：
    *   `[[w/unreal/abilitytask_playmontageandwait|AbilityTask_PlayMontageAndWait]]`: 播放 [[w/unreal/gas/montage|Montage]] 动画并等待其结束或触发特定事件。
    *   `[[w/unreal/abilitytask_waitgameplayevent|AbilityTask_WaitGameplayEvent]]`: 等待特定的 [[w/unreal/gameplay-events|Gameplay Event]] 标签被发送到拥有者 ASC。
    *   `[[w/unreal/abilitytask_waittargetdata|AbilityTask_WaitTargetData]]`: 等待目标选择完成（如玩家选择一个目标点或 Actor）。
    *   `[[w/unreal/abilitytask_waitdelay|AbilityTask_WaitDelay]]`: 等待指定的时间。
*   【注意】只有实例化（Instanced）的能力才能使用 AbilityTask。
*   【注意】AbilityTask 需要在 `ActivateAbility` 中创建并调用 `ReadyForActivation`。