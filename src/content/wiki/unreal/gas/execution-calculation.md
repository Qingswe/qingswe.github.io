---
title: Execution Calculation
description: Execution Calculation 在 GE 执行时完成复杂属性捕获与数值结算。
tags: [unreal, gas, wiki, execution-calculation, damage]
updated: 2025-04-29
---

在游戏效果中修改属性最强大的方式。归属于 GameplayEffect

决定了在应用该GameplayEffect时会发生什么
### 作用
- 捕获属性的数值
- 可以更改不止一个Attribute
- 可以执行任何类型的程序逻辑
### 注意事项
- 不支持预测
- 只有瞬时或周期性游戏效果可以使用
- 捕获这些属性不能在属性变化前运行，如果希望之前制作的限制有效，在属性变化前所做的任何限制必须在这里再次进行
- 仅在服务器上运行
- Only executed on the Server from GameplayAbilities with Local Predicted,Server Initiated, and Server Only Net Execution Policies

在捕获属性的时候，我们可以选择是否快照，而这只在我们从源头捕获属性时重要，即应用效果的事物，而不是目标。
快照属性会在[[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]]创建时被捕获，因此[[w/unreal/gas/execution-calculation|Execution Calculation]]是用于gameplay effect的。
比如说一个弹道击中时候，如果没开启快照就是 使用命中时Source的属性。使用快照就是这个弹道生成时的属性。同时因为弹道在生成时不存在目标，所以想要捕获target属性也没用

Spec中也可以存放一个 由GameplayTag和Value组成的keyPair(Magnitude)在创建该效果后进行设置，比如攻击的加成幅度之类。
### 如何在实际执行中捕获
```cpp
const FGameplayEffectSpec& Spec = ExecutionParams.GetOwningSpec();  
  
const FGameplayTagContainer* SourceTags = Spec.CapturedSourceTags.GetAggregatedTags();  
const FGameplayTagContainer* TargetTags = Spec.CapturedSourceTags.GetAggregatedTags();  
FAggregatorEvaluateParameters EvaluationParameters;  
EvaluationParameters.SourceTags = SourceTags;  
EvaluationParameters.TargetTags = TargetTags;  
  
float Armor=0.f;  
ExecutionParams.AttemptCalculateCapturedAttributeMagnitude(DamageStatics().ArmorDef,EvaluationParameters,Armor);

// 如果我们限制Armor，需要在这里再次进行限制  
Armor = FMath::Max<float>(Armor, 0.f);  
++Armor;  
  
FGameplayModifierEvaluatedData EvaluatedData(DamageStatics().ArmorProperty,EGameplayModOp::Additive,Armor);  
OutExecutionOutput.AddOutputModifier(EvaluatedData);
```
[[w/unreal/gas/fgameplayeffectattributecapturedefinition|FGameplayEffectAttributeCaptureDefinition]]
[[w/unreal/gas/fgameplaymodifierevaluateddata|FGameplayModifierEvaluatedData]]

[[w/unreal/gas/mmc|MMC]]