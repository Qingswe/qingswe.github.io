---
title: 游戏性能力预测概述
description: GAS Prediction 记录本地预测、回滚和 PredictionKey 的协作方式。
tags: [unreal, gas, wiki, prediction, network]
updated: 2025-04-20
---

### GAS Automatically Predicts 支持的预测操作
- Gameplay Ability Activation
- Triggered Events
- Gameplay Effect Application
	- Attribute Modifiers(not Execution Calculations)
	- GameplayTag Modification
- Gameplay Cue Events
	- From within a predicted Gameplay Ability
	- Their own Events
- Montages
- Movement(UCharacterMovement)
### 不支持预测的类型
- Gameplay Effect Removal
- Gameplay Effect Periodic Effects

## 概念
预测围绕着 PredictionKey 展开，当客户端执行预测性操作时，向服务器发送一个预测键。
然后在本地将客户端的预测操作和效果 与该 PredictionKey进行关联
服务器收到该键，决定接受或拒绝，然后将服务端的效果与 PredictionKey 进行关联。然后通知客户端接受还是拒绝

Replication只会从服务端到客户端产生，这种复制到客户端的过程是`FPredictionKey::NetSerialize`

当客户端预测性激活一个能力时，存在一个窗口，可以在其中执行预测性动作。
当这个窗口开启时，客户端可以执行重要的操作来改变游戏状态，比如更改属性等且无需向服务器请求许可

![[w/unreal/gas-prediction.png|GAS Prediction.png]]
## SideEffect 预测
![[w/unreal/gas-prediction-1.png|GAS Prediction-1.png]]

## GamePrediction.h
好的，这是对您提供的虚幻C++注释的中文Markdown翻译，已去除注释标记：


# 游戏性能力预测概述

## 高级目标：

*   在游戏性能力（Gameplay Ability）层面（实现一个能力时），预测应该是透明的。一个能力描述“执行 X->Y->Z”，系统会自动预测其中可预测的部分。
*   我们希望避免在能力本身的代码中出现类似“If Authority: Do X. Else: Do predictive version of X”这样的逻辑。

目前，并非所有情况都已解决，但我们拥有一个非常坚实的基础框架来处理客户端预测。

当我们说“客户端预测”时，我们真正指的是客户端预测游戏模拟状态。有些事情可以“完全在客户端进行”，而无需在这个预测系统内工作。例如，脚步声完全在客户端生成，不与此系统交互。但是，客户端预测他们在施放法术时法力从 100 降至 90，这属于“客户端预测”。

## 我们目前预测哪些内容？

*   初始游戏性能力激活（以及有特定限制的链式激活）
*   触发事件（Triggered Events）
*   GameplayEffect 应用：
    *   属性修改（**例外：** 执行计算（Executions）目前不预测，只预测属性修饰符（Attribute Modifiers））
    *   GameplayTag 修改
*   Gameplay Cue 事件（无论是来自预测性的 GameplayEffect 内部还是独立发生）
*   Montages（蒙太奇动画）
*   移动（已内置于 UE 的 UCharacterMovement 组件中）

## 我们不预测的一些内容（大多数有可能预测，但目前没有）：

*   GameplayEffect 移除
*   GameplayEffect 周期性效果（持续伤害/治疗的 Tick）

## 我们试图解决的问题：

1.  “我能做这个吗？” 预测的基本协议。
2.  “撤销（Undo）” 当预测失败时，如何撤销副作用。
3.  “重做（Redo）” 如何避免重新执行那些我们在本地预测过，但也从服务器同步下来的副作用。
4.  “完整性（Completeness）” 如何确保我们**真的**预测了所有副作用。
5.  “依赖关系（Dependencies）” 如何管理依赖性预测和预测事件链。
6.  “覆盖（Override）” 如何预测性地覆盖那些由服务器复制/拥有的状态。

---

## 实现细节

### *** [[w/unreal/gas/predictionkey|PredictionKey]] ***

### *** 能力激活 ***

能力激活是第一类预测行为——它生成一个初始预测键。每当客户端预测性地激活一个能力时，它会明确地向服务器请求，服务器也会明确地回应。==一旦能力被预测性地激活（但请求尚未发送），客户端就有一个有效的“预测窗口”，在此期间可以发生不需要明确“询问”的预测性副作用==。（例如，我们不明确询问“我能减少法力吗？我能给这个能力设置冷却时间吗？” 这些行为被视为与激活能力逻辑上是原子性的）。你==可以将这个预测窗口视为 ActivateAbility 的初始调用栈。一旦 ActivateAbility 结束，你的预测窗口（以及你的预测键）就不再有效==。这很重要，因为许多事情都可以使你的预测窗口失效，例如任何定时器或蓝图中的 Latent 节点；我们不会跨多帧进行预测。

AbilitySystemComponent 提供了一组函数来在客户端和服务器之间进行能力激活通信：TryActivateAbility -> ServerTryActivateAbility -> ClientActivateAbility(Failed/Succeed)。

1.  客户端调用 TryActivateAbility，生成一个新的 FPredictionKey 并调用 ServerTryActivateAbility。
2.  客户端继续执行（在收到服务器回应之前），使用与能力 ActivationInfo 关联的生成的 PredictionKey 调用 ActivateAbility。
3.  所有在调用 ActivateAbility 结束**之前**发生的副作用都会关联上生成的 FPredictionKey。
4.  服务器在 ServerTryActivateAbility 中决定能力是否真的发生了，调用 ClientActivateAbility(Failed/Succeed)，并将 UAbilitySystemComponent::ReplicatedPredictionKey 设置为客户端随请求发送的生成的键。
5.  如果客户端收到 ClientAbilityFailed，它会立即终止能力，并回滚与预测键关联的副作用。
    5a. ==“回滚”逻辑是通过 FPredictionKeyDelegates 和 FPredictionKey::NewRejectedDelegate / NewCaughtUpDelegate / NewRejectOrCaughtUpDelegate 注册的。==
    5b. ClientAbilityFailed 是目前唯一“拒绝”预测键的情况，因此我们当前所有的预测都依赖于能力是否激活成功。
6.  ==如果 ServerTryActivateAbility 成功==，客户端必须等待属性复制跟上（Succeed RPC 会立即发送，属性复制会自行发生）。一旦 ReplicatedPredictionKey 跟上了之前步骤中使用的键，==客户端就可以撤销其预测性的副作用。==
    参见 FReplicatedPredictionKeyItem::OnRep 中的 CatchUpTo 逻辑。参见 UAbilitySystemComponent::ReplicatedPredictionKeyMap 如何实际复制键。参见 ~FScopedPredictionWindow 中服务器如何确认键。

### *** GameplayEffect 预测 ***

==GameplayEffects 被视为能力激活的副作用，不会单独接受/拒绝。==

1.  只有在有有效的预测键时，GameplayEffects 才会在客户端上应用。（如果没有预测键，它会直接跳过在客户端上的应用）。
2.  如果 GameplayEffect 被预测，则属性、GameplayCues 和 GameplayTags 都会被预测。
3.  当 FActiveGameplayEffect 创建时，它会存储预测键（FActiveGameplayEffect::PredictionKey）。
    3a. 即时效果将在下面的“属性预测”中解释。
4.  在服务器上，同样的预测键也会设置在服务器的 FActiveGameplayEffect 上，该效果将被复制下来。
5.  ==作为客户端，如果你收到一个带有有效预测键的复制的 FActiveGameplayEffect，你会检查你是否有一个带有相同键的 ActiveGameplayEffect，如果匹配，我们不会执行“应用时”类型的逻辑，例如 GameplayCues。这解决了“重做”问题。但是，我们暂时会在 ActiveGameplayEffects 容器中拥有两个“相同”的 GameplayEffects：==
6.  同时，==FReplicatedPredictionKeyItem::OnRep 会跟上（caught up），预测性的效果将被移除。当它们在这种情况下被移除时，我们再次检查 PredictionKey，并决定是否不执行“移除时”的逻辑 / GameplayCue。==

至此，我们有效地预测了一个 GameplayEffect 作为副作用，并处理了“撤销”和“重做”问题。

参见 FActiveGameplayEffectsContainer::ApplyGameplayEffectSpec，其中注册了跟上（caught-up）时要执行的操作 (RemoveActiveGameplayEffect_NoReturn)。
参见 FActiveGameplayEffect::PostReplicatedAdd, FActiveGameplayEffect::PreReplicatedRemove 和 FActiveGameplayCue::PostReplicatedAdd，了解 FPredictionKey 如何与 GE 和 GC 关联的示例。

### *** 属性预测 ***

由于属性作为标准的 UProperty 进行复制，预测对它们的修改可能很棘手（“覆盖”问题）。即时修改可能更难，因为它们本质上是非状态性的。（例如，如果修改后没有簿记，回滚属性修改很困难）。这使得“撤销”和“重做”问题在这种情况下也很难解决。

基本的解决方法是将属性预测视为增量预测，而不是绝对值预测。我们不预测我们有 90 点法力，我们预测相对于服务器值我们有 -10 点法力，直到服务器确认我们的预测键。基本上，在预测性地执行即时修改时，将其视为对属性的**无限持续时间修改**。这解决了“撤销”和“重做”问题。

对于“覆盖”问题，我们可以在属性的 OnRep 中处理，将复制的（服务器）值视为属性的“基础值（base value）”，而不是“最终值（final value）”，并在复制发生后重新聚合我们的“最终值”。

1.  我们将预测性的即时 GameplayEffects 视为无限持续时间的 GameplayEffects。参见 UAbilitySystemComponent::ApplyGameplayEffectSpecToSelf。
2.  我们**必须总是**接收属性的 RepNotify 调用（不仅仅是当值相对于上次本地值发生变化时，因为我们会提前预测变化）。这通过 REPNOTIFY_Always 实现。
3.  在属性 RepNotify 中，我们调用 AbilitySystemComponent::ActiveGameplayEffects，根据新的“基础值”更新我们的“最终值”。GAMEPLAYATTRIBUTE_REPNOTIFY 可以做到这一点。
4.  其他一切都会像上面一样工作（GameplayEffect 预测）：当预测键跟上（caught up）时，预测性的 GameplayEffect 被移除，我们将恢复到服务器给定的值。

示例：

```cpp
void UMyHealthSet::GetLifetimeReplicatedProps(TArray< FLifetimeProperty > & OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);

	DOREPLIFETIME_CONDITION_NOTIFY(UMyHealthSet, Health, COND_None, REPNOTIFY_Always);
}

void UMyHealthSet::OnRep_Health()
{
	GAMEPLAYATTRIBUTE_REPNOTIFY(UMyHealthSet, Health);
}
```

### *** Gameplay Cue 事件 ***

除了已经在 GameplayEffects 中解释过的之外，Gameplay Cues 也可以独立激活。这些函数（UAbilitySystemComponent::ExecuteGameplayCue 等）会考虑网络角色和预测键。

1.  在 UAbilitySystemComponent::ExecuteGameplayCue 中，如果是权威端，则执行多播事件（带复制键）。如果是非权威端但有有效的预测键，则预测 GameplayCue。
2.  在接收端（NetMulticast_InvokeGameplayCueExecuted 等），如果存在复制键，则不执行事件（假定你已经预测了它）。

请记住，FPredictionKeys 只复制到原始拥有者。这是 FPredictionKey 的一个固有属性。

### *** 触发数据预测 ***

触发数据（Triggered Data）目前用于激活能力。本质上，这都通过与 ActivateAbility 相同的代码路径。不同之处在于，能力不是通过输入按下激活，而是通过其他游戏代码驱动的事件激活。客户端能够预测性地执行这些事件，从而预测性地激活能力。

然而，这里有一些细微之处，因为服务器也会运行触发事件的代码。服务器不会仅仅等待来自客户端的通知。服务器会维护一个列表，记录从预测性能力激活的触发能力。当收到来自触发能力的 TryActivate 时，服务器会查看**它是否**已经运行了这个能力，并回应相关信息。

问题是，我们目前无法正确回滚这些操作。在触发事件和复制方面还有工作要做。（在文末解释）。

---

## 高级话题！

### *** 依赖关系 ***

我们可能会遇到这样的情况：“能力 X 激活并立即触发一个事件，该事件激活能力 Y，能力 Y 又触发另一个能力 Z”。依赖链是 X->Y->Z。这些能力中的每一个都可能被服务器拒绝。如果 Y 被拒绝，那么 Z 也从未发生，但服务器不会尝试运行 Z，因此服务器不会明确决定“Z 不能运行”。

为了处理这种情况，我们引入了基础预测键（Base PredictionKey）的概念，它是 FPredictionKey 的一个成员。调用 TryActivateAbility 时，我们传入当前的 PredictionKey（如果适用）。这个预测键将被用作任何新生成的预测键的基础。我们通过这种方式构建键的链条，然后如果 Y 被拒绝，就可以使 Z 失效。

不过，这稍微有点微妙。在 X->Y->Z 的情况中，服务器在尝试自行运行链条之前，只会收到 X 的 PredictionKey。例如，它会使用客户端发送给它的原始预测键尝试激活 Y 和 Z，而客户端每次调用 TryActivateAbility 都会生成一个新的 PredictionKey。客户端**必须**为每个能力激活生成一个新的 PredictionKey，因为每个激活在逻辑上不是原子性的。在事件链中产生的每个副作用都必须有一个唯一的 PredictionKey。我们不能让在 X 中产生的 GameplayEffects 与在 Z 中产生的 GameplayEffects 拥有相同的 PredictionKey。

为了解决这个问题，X 的预测键被视为 Y 和 Z 的基础键。Y 对 Z 的依赖关系完全保留在客户端，这通过 FPredictionKeyDelegates::AddDependancy 实现。我们添加委托，以便在 Y 被拒绝/确认时拒绝/跟上 Z。

这种依赖系统允许我们在单个预测窗口/范围内拥有多个并非逻辑上原子性的预测行为。

然而存在一个问题：由于依赖关系保存在客户端，服务器实际上并不知道它之前是否拒绝过一个依赖性行为。你可以通过在游戏性能力中使用激活标签来设计规避这个问题。例如，在预测依赖性 GA_Combo1 -> GA_Combo2 时，你可以让 GA_Combo2 只有在拥有 GA_Combo1 赋予的 GameplayTag 时才能激活。这样，GA_Combo1 的拒绝也会导致服务器拒绝激活 GA_Combo2。

### *** 额外的预测窗口（在能力内部） ***

如前所述，一个预测键只能在一个逻辑范围内使用。一旦 ActivateAbility 返回，该键基本上就完成了。如果能力正在等待外部事件或定时器，则在我们准备继续执行时，可能已经收到服务器的确认/拒绝。因此，初始激活后产生的任何额外副作用都不能再与原始键的生命周期绑定。

这并非完全不好，只是能力有时会需要响应玩家输入。例如，“按住蓄力”能力希望在按钮释放时立即预测一些内容。可以通过 FScopedPredictionWindow 在能力内部创建一个新的预测窗口。

FScopedPredictionWindow 提供了一种向服务器发送新的预测键，并让服务器在同一个逻辑范围内接收并使用该键的方式。

UAbilityTask_WaitInputRelease::OnReleaseCallback 是一个很好的例子。事件流程如下：

1.  客户端进入 UAbilityTask_WaitInputRelease::OnReleaseCallback 并启动一个新的 FScopedPredictionWindow。这会为这个范围创建一个新的预测键 (FScopedPredictionWindow::ScopedPredictionKey)。
2.  客户端调用 AbilitySystemComponent->ServerInputRelease，该函数将 ScopedPrediction.ScopedPredictionKey 作为参数传递。
3.  服务器运行 ServerInputRelease_Implementation，它接收传入的 PredictionKey，并将其设置为 UAbilitySystemComponent::ScopedPredictionKey，伴随一个 FScopedPredictionWindow。
4.  服务器**在同一个范围内**运行 UAbilityTask_WaitInputRelease::OnReleaseCallback。
5.  当服务器在 ::OnReleaseCallback 中遇到 FScopedPredictionWindow 时，它会从 UAbilitySystemComponent::ScopedPredictionKey 获取预测键。该键现在用于此逻辑范围内所有副作用。
6.  一旦服务器结束此范围预测窗口，使用的预测键完成，并设置为 ReplicatedPredictionKey。
7.  在此范围内创建的所有副作用现在在客户端和服务器之间共享一个键。

这种方式成功的关键在于 ::OnReleaseCallback 调用 ::ServerInputRelease，后者又在服务器上调用 ::OnReleaseCallback。在给定预测键被使用之前，没有其他事情有机会发生。

虽然此示例中没有“Try/Failed/Succeed”调用，但所有副作用都是程序上分组/原子性的。这解决了客户端和服务器上运行的任何任意函数调用的“撤销”和“重做”问题。

---

## 不支持 / 问题 / 待办事项

触发事件不会明确复制。例如，如果一个触发事件只在服务器上运行，客户端永远不会知道。这还阻止了跨玩家/AI 等事件的实现。对此的支持最终应该添加，并且应该遵循与 GameplayEffect 和 GameplayCues 相同的模式（使用预测键预测触发事件，如果 RPC 事件带有预测键则忽略）。

这个整个系统的一个重大注意事项：目前无法开箱即用地回滚任何链式激活（包括触发事件）。原因是每个 ServerTryActivateAbility 会按顺序回应。让我们以链式依赖 GA 为例：GA_Mispredict -> GA_Predict1。在这个例子中，当 GA_Mispredict 被激活并在本地预测时，它会立即同时激活 GA_Predict1。客户端发送 GA_Mispredict 的 ServerTryActivateAbility，服务器拒绝它（发送回 ClientActivateAbilityFailed）。就目前而言，我们没有任何委托来拒绝客户端上的依赖能力（而且服务器甚至不知道存在依赖关系）。在服务器上，它也收到了 GA_Predict1 的 ServerTryActivateAbility。假设该请求成功，客户端和服务器现在都在执行 GA_Predict1，即使 GA_Mispredict 从未发生。你可以通过使用标签系统来确保 GA_Mispredict 成功来设计规避这个问题。

### *** 预测“元”属性（如伤害/治疗）与“真实”属性（如生命值） ***

我们无法预测性地应用元属性（Meta Attributes）。元属性只对即时效果有效，在 GameplayEffect 的后端（UAttributeSet 的 Pre/Post Modify Attribute）工作。这些事件在应用基于持续时间的 GameplayEffects 时不会被调用。例如，一个修改伤害持续 5 秒的 GameplayEffect 是没有意义的。

为了支持这一点，我们可能需要增加对基于持续时间的元属性的有限支持，并将即时 GameplayEffect 的转换从前端（UAbilitySystemComponent::ApplyGameplayEffectSpecToSelf）移动到后端（UAttributeSet::PostModifyAttribute）。

### *** 预测持续的乘法性 GameplayEffects ***

预测基于百分比的 GameplayEffects 时也存在限制。由于服务器复制的是属性的“最终值”，而不是修改它的整个聚合器链，我们可能会遇到客户端无法准确预测新 GameplayEffects 的情况。

例如：

*   客户端有一个永久性的 +10% 移动速度增益，基础移动速度为 500 -> 最终移动速度为 550。
*   客户端有一个能力，额外提供 10% 的移动速度增益。预期它会**叠加**百分比乘数，总共提供 20% 的增益，使速度从 500 变为 600。
*   然而，在客户端上，我们只是将 10% 的增益应用于 550 -> 结果是 605。

这需要通过复制属性的聚合器链来修复。我们已经复制了部分数据，但不是完整的修饰符列表。我们最终需要考虑支持这一点。

### *** “弱预测” ***

可能仍然会有一些情况不太适合这个系统。有些情况无法进行预测键交换。例如，一个能力使与之碰撞/接触的任何玩家受到减速的 GameplayEffect，并且他们的材质变为蓝色。由于我们无法在每次发生这种情况时都发送服务器 RPC（且服务器不一定能在模拟的那个时间点处理消息），因此无法关联客户端和服务器之间的 GameplayEffect 副作用。

这里的一种方法可能是考虑一种较弱形式的预测。在这种预测模式下，不使用新的预测键，而是服务器假定客户端会预测整个能力的副作用。这至少能解决“重做”问题，但无法解决“完整性”问题。如果客户端的预测能尽可能地最小化——例如只预测一个初始粒子效果，而不是预测状态和属性变化——那么问题就会变得不那么严重。

我能想象一种弱预测模式，作为某些能力（或所有能力？）在没有能够准确关联副作用的新预测键时的后备方案。在弱预测模式下，也许只有某些动作可以预测——例如 GameplayCue 执行事件，而不是 OnAdded/OnRemove 事件。

```cpp
/**
 *	FPredictionKey 是在 GameplayAbility 系统中支持客户端预测的一种通用方式。
 *	FPredictionKey 本质上是一个用于识别在客户端上执行的预测性行为和副作用的 ID。
 *	UAbilitySystemComponent 支持预测键及其副作用在客户端和服务器之间的同步。
 *	
 *	基本上，任何事物都可以与一个 PredictionKey 关联，例如激活一个能力。
 *	客户端可以生成一个新的 PredictionKey，并在其 ServerTryActivateAbility 调用中发送给服务器。
 *	服务器可以确认或拒绝此调用 (ClientActivateAbilitySucceed/Failed)。
 *	
 *	当客户端预测其能力时，它会创建副作用 (GameplayEffects, TriggeredEvents, Animations 等)。
 *	客户端在预测这些副作用时，会将每一个都与能力激活开始时生成的预测键关联起来。
 *	
 *	如果能力激活被拒绝，客户端可以立即回滚这些副作用。
 *	如果能力激活被接受，客户端必须等待服务器创建的副作用复制到客户端。
 *		(ClientActivateAbilitySucceed RPC 将立即发送。属性复制可能会在几帧后发生)。
 *		一旦服务器创建的副作用复制完成，客户端就可以撤销其本地预测的副作用。
 *		
 *	FPredictionKey 本身主要提供了以下功能：
 *		-唯一 ID 和一个支持预测键依赖链（“Current”和“Base”整数）的系统
 *		-一个特殊的 ::NetSerialize 实现，***它只将预测键序列化给正在预测的客户端***
 *			-这很重要，因为它允许我们在复制的状态中序列化预测键，并知道只有将预测键发送给服务器的客户端才能真正看到它们！
 *	
 */
```