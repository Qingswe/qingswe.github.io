---
title: FGameplayEffectAttributeCaptureDefinition
description: AttributeCaptureDefinition 定义 Execution 或 MMC 中要捕获的属性。
tags: [unreal, gas, wiki, attribute-capture, execution]
updated: 2025-04-30
---

# FGameplayEffectAttributeCaptureDefinition

【重点】`FGameplayEffectAttributeCaptureDefinition` 用来声明“**要捕获哪个属性、从 Source 还是 Target 取、是在创建 Spec 时冻结还是在执行时再读**”。它本身不负责算数值，而是给 [[w/unreal/gas/mmc|MMC]] 和 [[w/unreal/gas/execution-calculation|Execution Calculation]] 提供输入规则。

## 核心字段

- `AttributeToCapture`：要读取的属性，通常来自某个 `AttributeSet`，例如护甲、暴击率、智力。
- `AttributeSource`：从 `Source` 还是 `Target` 捕获。
- `bSnapshot`：是否在 [[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]] 创建时就把值快照下来。

## Source / Target 怎么理解

- `Source`：施加效果的一方，通常是技能施放者、投射物来源者。
- `Target`：承受效果的一方，通常是被命中的角色。

【例子】做伤害计算时：

- 攻击力、暴击率、护甲穿透通常来自 `Source`
- 护甲、抗性、格挡率通常来自 `Target`

## bSnapshot 的意义

【重点】`bSnapshot` 决定“**读的是创建时的值，还是结算时的值**”。

- `true`：在 `Spec` 创建时捕获一次，后面计算直接用这份值。
- `false`：在真正执行 MMC / Execution 时再读当前属性。

【例子】投射物在发射后过一段时间才命中：

- 如果你希望伤害跟随“发射瞬间”的攻击力，就把 `Source` 属性设为 `bSnapshot = true`
- 如果你希望伤害跟随“命中瞬间”的攻击力，就设为 `false`

【注意】`Target` 在 `Spec` 创建时往往还没确定，因此 `Target` 属性更常见的是非快照读取。

## 在 MMC / Execution 中怎么用

通常有两步：

1. 在构造函数里定义 capture definition。
2. 把它加入 `RelevantAttributesToCapture`，让引擎知道这次计算需要这些属性。

```cpp
UMMC_MaxMana::UMMC_MaxMana()
{
    IntelligenceDef.AttributeToCapture = UAuraAttributeSet::GetIntelligenceAttribute();
    IntelligenceDef.AttributeSource = EGameplayEffectAttributeCaptureSource::Target;
    IntelligenceDef.bSnapshot = false;

    RelevantAttributesToCapture.Add(IntelligenceDef);
}
```

真正求值时再配合 `Spec` 和标签上下文读取：

- [[w/unreal/gas/mmc|MMC]] 中常见 `GetCapturedAttributeMagnitude(...)`
- [[w/unreal/gas/execution-calculation|Execution Calculation]] 中常见 `AttemptCalculateCapturedAttributeMagnitude(...)`

## 完整链路

1. [[w/unreal/gas/gameplayability|GameplayAbility]] 或 `ASC` 创建 [[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]]
2. `MMC` / `Execution Calculation` 按 `FGameplayEffectAttributeCaptureDefinition` 声明去抓取属性
3. 结合 `SourceTags` / `TargetTags` 做最终求值
4. 输出到 [[w/unreal/gas/fgameplaymodifierevaluateddata|FGameplayModifierEvaluatedData]] 或直接作为 modifier 的量级

## 常见坑

- 【注意】只声明 capture definition 还不够，忘记加入 `RelevantAttributesToCapture` 时，计算阶段拿不到值。
- 【注意】快照不是“性能优化开关”，而是业务语义。它会直接影响弹道、延迟结算、Buff 动态变化下的结果。
- 【技巧】当计算依赖标签条件时，记得把 `CapturedSourceTags` 和 `CapturedTargetTags` 一起传给 `FAggregatorEvaluateParameters`。

## 关联笔记

- [[w/unreal/gas/mmc|MMC]]
- [[w/unreal/gas/execution-calculation|Execution Calculation]]
- [[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]]
- [[w/unreal/gas/fgameplaymodifierevaluateddata|FGameplayModifierEvaluatedData]]