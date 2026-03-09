---
title: AnimMontage - 动画蒙太奇
description: AnimMontage 在 GAS 中承担技能动作播放与时序同步。
tags: [unreal, gas, wiki, montage, animation]
updated: 2025-04-17
---

# AnimMontage - 动画蒙太奇

【重点】`UAnimMontage` 是 Unreal Engine 中强大的动画资源，允许你组合多个动画片段 (`AnimSequence`)、定义播放逻辑、添加事件通知 (`AnimNotifies`)，并控制动画在骨骼网格体上的播放方式（例如，只播放上半身动画）。

在 Gameplay Ability System (GAS) 中，Montage 主要用于**播放与 [[w/unreal/gas/gameplayability|GameplayAbility]] 相关联的角色动画**，如攻击、施法、受击等。

---

## Montage 在 GAS 中的核心用途

1.  **播放能力动画**: 通过 [[w/unreal/abilitytask_playmontageandwait|AbilityTask_PlayMontageAndWait]] 在 [[w/unreal/gas/gameplayability|GameplayAbility]] 激活时播放特定的 Montage。
2.  **同步动画与逻辑**: 利用 Montage 内的 [[w/unreal/gas/montageevent|AnimNotifies]] 在动画播放到特定时间点时触发游戏逻辑（例如，在挥剑动画的击中帧应用伤害效果）。
3.  **控制动画混合**: 使用插槽 (Slots) 和混合设置 (Blend In/Out) 来控制 Montage 如何与其他动画（如基础移动）平滑地混合。
4.  **网络同步**: `AbilityTask_PlayMontageAndWait` 会处理 Montage 播放的服务器授权和客户端同步。

---

## AbilityTask_PlayMontageAndWait

【重点】这是 GAS 中播放 Montage 的**标准能力任务 (AbilityTask)**。

### 创建与使用

在 [[w/unreal/gas/gameplayability|GameplayAbility]] 的 `ActivateAbility` 中：

```cpp
// AbilityTask_PlayMontageAndWait.h 需要包含

// 1. 获取要播放的 Montage
UAnimMontage* MontageToPlay = LoadObject<UAnimMontage>(nullptr, TEXT("/Game/Path/To/Your/AM_Attack.AM_Attack"));

if (MontageToPlay)
{
    // 2. 创建 PlayMontageAndWait 任务
    UAbilityTask_PlayMontageAndWait* PlayMontageTask = UAbilityTask_PlayMontageAndWait::CreatePlayMontageAndWaitProxy(
        this,               // Owning Ability
        FName("MontageTask"), // Task Instance Name (optional)
        MontageToPlay,      // Montage to play
        1.0f,               // Rate (播放速率)
        NAME_None,          // Start Section Name (默认从头开始)
        true                // bStopWhenAbilityEnds (能力结束时是否停止 Montage)
    );

    if (PlayMontageTask)
    {
        // 3. 绑定回调委托
        PlayMontageTask->OnCompleted.AddDynamic(this, &UMyGameplayAbility::OnMontageCompleted);
        PlayMontageTask->OnBlendOut.AddDynamic(this, &UMyGameplayAbility::OnMontageBlendOut);
        PlayMontageTask->OnInterrupted.AddDynamic(this, &UMyGameplayAbility::OnMontageInterrupted);
        PlayMontageTask->OnCancelled.AddDynamic(this, &UMyGameplayAbility::OnMontageCancelled);
        PlayMontageTask->EventReceived.AddDynamic(this, &UMyGameplayAbility::OnMontageEventReceived); // 监听 Montage 事件

        // 4. 激活任务
        PlayMontageTask->ReadyForActivation();
    }
    else
    {
        EndAbility(CurrentSpecHandle, CurrentActorInfo, CurrentActivationInfo, true, true); // 任务创建失败，结束能力
    }
}
else
{
    EndAbility(CurrentSpecHandle, CurrentActorInfo, CurrentActivationInfo, true, true); // Montage 加载失败，结束能力
}

```

### 回调委托说明

*   `OnCompleted`: Montage 正常播放完成时触发。
*   `OnBlendOut`: Montage 开始混合淡出时触发。
*   `OnInterrupted`: Montage 被其他 Montage 打断时触发。
*   `OnCancelled`: 能力被取消导致 Montage 停止时触发。
*   `EventReceived`: 【重点】当 Montage 中定义的 `AnimNotifyState` 或 `AnimNotify` 触发，并且该 Notify 关联了一个 [[w/unreal/gas/montageevent|Gameplay Event Tag]] 时触发。传递 `FGameplayEventData` 作为参数。

---

## 蓝图节点

*   `Play Montage`: 在动画蓝图中直接播放 Montage（不推荐用于 GAS 能力动画）。
*   `Play Montage and Wait` (Ability Task): 在 [[w/unreal/gas/gameplayability|GameplayAbility]] 蓝图中使用的对应节点，功能与 C++ 的 `UAbilityTask_PlayMontageAndWait` 类似。
*   `Montage Play`: 播放 Montage（同样，GAS 中推荐使用 AbilityTask）。

---

## 重要概念链接

*   [[w/unreal/gas/gameplayability|GameplayAbility]]：播放 Montage 的发起者。
*   [[w/unreal/gas/abilitytask|AbilityTask]] / `[[w/unreal/abilitytask_playmontageandwait|AbilityTask_PlayMontageAndWait]]`：执行 Montage 播放的标准方式。
*   [[w/unreal/gas/montageevent|MontageEvent]]：Montage 中用于触发逻辑的点。
*   [[w/unreal/gameplay-events|Gameplay Events]]：Montage 事件通常通过 Gameplay Event Tag 传递。

---

## 注意事项

*   【注意】确保 Montage 中使用的动画插槽 (Slot) 在角色动画蓝图的 AnimGraph 中被正确处理，否则 Montage 可能无法播放或混合。
*   【技巧】合理使用 `Start Section Name` 可以让一个 Montage 包含多个动作阶段（如攻击前摇、攻击命中、攻击后摇），方便在能力中控制播放特定部分。
*   【注意】`bStopWhenAbilityEnds` 参数很重要。如果为 `true`，能力结束时 Montage 会停止；如果为 `false`，即使能力结束，Montage 也会继续播放完（除非被其他 Montage 打断）。
*   【技巧】在多人游戏中，`AbilityTask_PlayMontageAndWait` 会自动处理服务器通知客户端播放 Montage 的逻辑。