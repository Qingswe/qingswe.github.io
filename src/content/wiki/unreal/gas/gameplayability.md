---
title: GameplayAbility (GA) - 游戏能力
description: GameplayAbility 定义技能激活、消耗、冷却和执行逻辑。
tags: [Unreal, GAS]
updated: 2025-04-17
---

# GameplayAbility (GA) - 游戏能力

【重点】`UGameplayAbility` 是 GAS 中定义**角色可以执行的动作或技能**的核心类。它封装了能力的激活逻辑、消耗（Cost）、冷却（Cooldown）、目标选择（Targeting）以及执行效果（如应用 [[w/unreal/gas/gameplayeffect|GameplayEffect]] 或播放动画）等。

与 [[w/unreal/gas/gameplayeffect|GameplayEffect]] 不同，`GameplayAbility` 通常包含**主动逻辑**，需要被明确**激活 (Activate)** 才能执行。

---

## 核心特性与配置

### 1. Instancing Policy - 实例化策略

【重点】决定了能力实例的创建方式：

*   **Instanced Per Execution**: 【例子】每次激活能力时都创建一个新的能力实例对象。适用于需要独立状态或计时器的能力（如持续施法）。【注意】开销相对较大。
*   **Instanced Per Actor**: 【例子】每个拥有该能力的 [[w/unreal/gas/asc|ASC]] 只创建一个能力实例对象。适用于无状态或状态共享的能力（如瞬发技能）。【技巧】性能较好。
*   **Non-Instanced**: 【例子】不创建实例，直接在类默认对象 (CDO) 上执行。适用于非常简单、完全无状态的静态检查或触发。【注意】限制最多，不能使用 [[w/unreal/gas/abilitytask|AbilityTask]]，不能有状态变量。

### 2. Net Execution Policy - 网络执行策略

【重点】定义能力如何在网络环境中执行：

*   **Local Predicted**: 【例子】客户端先预测执行，然后发送请求到服务器，服务器验证后执行，并将结果同步回客户端。适用于需要快速响应的玩家操作（如普通攻击、移动技能）。需要 [[w/unreal/gas/gas-prediction|预测]] 支持。
*   **Local Only**: 只在本地执行，不通知服务器。适用于纯粹的本地视觉效果或 UI 操作。
*   **Server Initiated**: 只能由服务器发起激活。适用于 AI 控制的能力或服务器触发的事件。
*   **Server Only**: 只在服务器执行，客户端无法激活。适用于内部逻辑或作弊检测。

### 3. Ability Tags - 能力标签

【重点】使用 [[w/unreal/gameplay-tags|Gameplay Tags]] 来管理和识别能力：

*   **Ability Tags**: 标识能力本身的标签（如 `Ability.Skill.Fireball`, `Ability.Action.Jump`）。用于查找、激活或阻止能力。
*   **Cancel Abilities with Tag**: 当此能力激活时，自动取消目标 [[w/unreal/gas/asc|ASC]] 上其他拥有这些标签的正在运行的能力。【例子】冲刺能力可以取消行走能力。
*   **Block Abilities with Tag**: 当此能力激活时，阻止目标 [[w/unreal/gas/asc|ASC]] 激活其他拥有这些标签的能力。【例子】眩晕状态下阻止移动能力。
*   **Activation Owned Tags**: 能力激活期间，将这些标签**临时授予**给拥有者 [[w/unreal/gas/asc|ASC]]。【例子】施法时授予 `State.Casting` 标签，防止被打断或执行其他动作。
*   **Activation Required Tags**: 激活能力时，拥有者 [[w/unreal/gas/asc|ASC]] **必须拥有**这些标签。
*   **Activation Blocked Tags**: 激活能力时，拥有者 [[w/unreal/gas/asc|ASC]] **不能拥有**这些标签。

### 4. Triggers - 触发器

【技巧】允许能力通过 [[w/unreal/gameplay-events|Gameplay Events]] 或 [[w/unreal/gameplay-tags|Gameplay Tags]] 的添加/移除自动激活，而不仅仅是通过输入。

*   **Ability Triggers**: 配置监听的事件标签或 Gameplay Tag，当匹配时自动尝试激活能力。

### 5. Cost & Cooldown - 消耗与冷却

【重点】定义能力激活所需的资源和使用后的限制：

*   **Cost GameplayEffect Class**: 指定一个 [[w/unreal/gas/gameplayeffect|GameplayEffect]]（通常是 `Instant` 类型），在能力**提交 (Commit)** 时应用给拥有者，用于扣除资源（如法力值、耐力）。
*   **Cooldown GameplayEffect Class**: 指定一个 [[w/unreal/gas/gameplayeffect|GameplayEffect]]（通常是 `Has Duration` 类型），在能力**提交 (Commit)** 时应用给拥有者，用于施加冷却时间。该 GE 通常会授予一个 Cooldown Tag。
*   **Cooldown Tags**: 用于检查冷却状态的 [[w/unreal/gameplay-tags|Gameplay Tags]]。`GetCooldownTimeRemaining` 会检查这些标签关联的 GE 剩余时间。

---

## 核心生命周期函数

【重点】理解能力的执行流程对于编写自定义能力至关重要：

1.  **`CanActivateAbility`**
    *   【重点】检查能力**当前是否可以被激活**。这是一个 `const` 函数，可以安全地在任何地方调用（如 UI 显示可用性）。
    *   【注意】应检查消耗（`CheckCost`）、冷却（`CheckCooldown`）以及其他自定义逻辑（如目标是否在范围内）。
    *   返回 `true` 表示理论上可以激活。

2.  **`CallActivateAbility`**
    *   【内部】一个非虚的入口函数，通常由 `TryActivateAbility` 调用。它处理一些通用的前置逻辑（如实例化），然后调用虚函数 `ActivateAbility`。

3.  **`ActivateAbility`**
    *   【重点】**能力的核心逻辑**所在！这是子类需要重写的关键函数。
    *   在这里执行能力的操作，如播放动画（通过 [[w/unreal/abilitytask_playmontageandwait|AbilityTask_PlayMontageAndWait]]）、等待事件（[[w/unreal/abilitytask_waitgameplayevent|AbilityTask_WaitGameplayEvent]]）、应用 [[w/unreal/gas/gameplayeffect|GameplayEffect]]、生成投射物、执行目标选择等。
    *   【注意】**必须**在确认能力成功执行并要应用消耗/冷却时调用 `CommitAbility`。
    *   【注意】**必须**在能力逻辑完成或被打断时调用 `EndAbility` 来结束能力。

4.  **`CommitAbility`**
    *   【重点】**提交能力**。调用此函数会执行：
        *   应用 `Cost GameplayEffect`。
        *   应用 `Cooldown GameplayEffect`。
        *   触发 `OnGameplayAbilityCommitted` 委托。
    *   【注意】只应调用一次，且通常在 `ActivateAbility` 内部调用。
    *   【技巧】调用前可以通过 `CheckCost` 和 `CheckCooldown` 再次检查，确保提交时条件仍然满足。

5.  **`CancelAbility`**
    *   【重点】从外部**取消**正在运行的能力（例如，被其他能力打断，或玩家手动取消）。
    *   触发 `OnGameplayAbilityCancelled` 委托。
    *   通常需要在这里调用 `EndAbility` 来清理和结束能力。

6.  **`EndAbility`**
    *   【重点】**结束能力**的执行。能力逻辑完成、失败或被取消时，必须调用此函数。**通常由能力内部自身进行调用**
    *   清理能力状态、移除授予的 `ActivationOwnedTags`、销毁实例（如果是 Instanced Per Execution）。
    *   触发 `OnGameplayAbilityEnded` 委托。
    *   【注意】忘记调用 `EndAbility` 会导致能力卡死或资源泄露！

---

## 常用辅助函数

*   **`MakeOutgoingGameplayEffectSpec`**: 【技巧】便捷地创建一个基于指定 [[w/unreal/gas/gameplayeffect|GameplayEffect]] 类的新 `FGameplayEffectSpec`，并自动填充默认的 [[w/unreal/gas/effectcontext|EffectContext]]。可以在创建后进一步修改 Spec。
*   **`ApplyGameplayEffectSpecToOwner` / `ApplyGameplayEffectSpecToTarget`**: 应用创建好的 Spec。
*   **`MakeEffectContext`**: 创建一个默认的 [[w/unreal/gas/effectcontext|EffectContext]] 句柄，可以用于 `MakeOutgoingGameplayEffectSpec` 或自定义用途。
*   **`GetCurrentActorInfo`**: 获取能力相关的 Actor 信息（拥有者 Avatar, PlayerController, [[w/unreal/gas/asc|ASC]] 等）。
*   **`GetAvatarActorFromActorInfo`**: 获取能力的拥有者 Actor。
*   **`GetAbilitySystemComponentFromActorInfo`**: 获取拥有者的 [[w/unreal/gas/asc|ASC]]。
*   **`GetCooldownTimeRemaining`**: 【技巧】获取当前能力的冷却剩余时间。它会检查与能力 Cooldown Tags 关联的 GE。
*   **`K2_ApplyGameplayEffectSpecToTarget`**: 蓝图节点，应用 GE Spec。
*   **`K2_EndAbility`**: 蓝图节点，结束能力。

---

## [[w/unreal/gas/abilitytask|AbilityTask]] - 能力任务

【重点】`UAbilityTask` 是在 `GameplayAbility` 中执行**异步操作**（如等待动画完成、等待网络事件、等待延迟）的专用类。

*   【技巧】能力任务使得复杂的、包含等待状态的能力逻辑可以用类似于状态机的方式编写，而不会阻塞游戏线程。
*   常见的任务包括：
    *   `[[w/unreal/abilitytask_playmontageandwait|AbilityTask_PlayMontageAndWait]]`: 播放 [[w/unreal/gas/montage|Montage]] 动画并等待其结束或触发特定事件。
    *   `[[w/unreal/abilitytask_waitgameplayevent|AbilityTask_WaitGameplayEvent]]`: 等待特定的 [[w/unreal/gameplay-events|Gameplay Event]] 标签被发送到拥有者 ASC。
    *   `[[w/unreal/abilitytask_waittargetdata|AbilityTask_WaitTargetData]]`: 等待目标选择完成（如玩家选择一个目标点或 Actor）。
    *   `[[w/unreal/abilitytask_waitdelay|AbilityTask_WaitDelay]]`: 等待指定的时间。
*   【注意】只有实例化（Instanced）的能力才能使用 AbilityTask。
*   【注意】AbilityTask 需要在 `ActivateAbility` 中创建并调用 `ReadyForActivation`。

---

## 输入绑定 (Input Binding)

【技巧】可以将 [[w/unreal/gas/gameplayability|GameplayAbility]] 直接绑定到玩家输入：

1.  在 [[w/unreal/gas/related/enhancedinputcomponent|EnhancedInputComponent]] 设置中，将输入 Action 映射到一个 [[w/unreal/gameplay-tags|Gameplay Tag]]。
2.  在 [[w/unreal/gas/asc|ASC]] 组件上，调用 `BindAbilityActivationToInputComponent`，将输入标签与对应的能力槽位（或直接与能力）关联起来。
3.  当玩家按下输入时，ASC 会自动尝试激活绑定到该输入标签的能力（调用 `TryActivateAbility`）。

---

## 重要概念链接

*   [[w/unreal/gas/asc|ASC]]：授予和激活 GA 的组件。
*   [[w/unreal/gas/gameplayeffect|GameplayEffect]]：GA 通常用于应用 GE 来产生效果。
*   [[w/unreal/attributeset|AttributeSet]]：GA 可能需要检查或修改属性（通过 GE）。
*   [[w/unreal/gameplay-tags|Gameplay Tags]]：广泛用于能力识别、状态控制、触发和条件检查。
*   [[w/unreal/gas/abilitytask|AbilityTask]]：在 GA 中执行异步操作。
*   [[w/unreal/gas/montage|Montage]]：常用于播放能力动画。
*   [[w/unreal/gameplay-events|Gameplay Events]]：用于能力内部或能力间的通信和触发。
*   [[w/unreal/gas/gas-prediction|预测]]：实现客户端预测执行。
*   [[w/unreal/targeting|Targeting]] (涉及 `[[w/unreal/gas/fgameplayabilitytargetdata|FGameplayAbilityTargetData]]`, `[[w/unreal/gas/gameabilitytargettypes|GameAbilityTargetTypes]]`)：能力的目标选择机制。
*   [[w/unreal/gas/effectcontext|EffectContext]]：传递能力相关的元数据。
*   [[w/unreal/gas/sourceobject|SourceObject]]：通常在 Context 中指定能力的来源。

---

## 常见问题与注意点

*   【注意】**生命周期管理**：确保 `CommitAbility` 和 `EndAbility` 在正确的时机被调用。
*   【注意】**网络同步**：根据 `Net Execution Policy` 处理服务器和客户端的逻辑差异，特别是在使用预测时。
*   【注意】**实例策略选择**：根据能力是否有状态、是否需要 Task，选择合适的 `Instancing Policy`。
*   【技巧】利用 [[w/unreal/gameplay-tags|Gameplay Tags]] 进行状态管理（如 `State.Casting`, `State.Busy`）可以简化逻辑。
*   【技巧】对于复杂能力，将逻辑分解到多个 [[w/unreal/gas/abilitytask|AbilityTask]] 中可以提高可读性和可维护性。