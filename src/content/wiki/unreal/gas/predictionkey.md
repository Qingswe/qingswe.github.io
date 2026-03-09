---
title: PredictionKey
description: PredictionKey 是客户端预测与服务器确认之间的关联键。
tags: [unreal, gas, wiki, prediction-key, network]
updated: 2025-04-19
---

## PredictionKey 是什么

【重点】`FPredictionKey` 是 GAS 客户端预测的“关联单号”。客户端先预测地做了一些事，服务器稍后确认或拒绝时，就靠这个 key 把两边的行为对应起来。

可以把它理解成：

- 客户端说：“我先按这个 key 预测执行一次。”
- 服务器说：“这个 key 我接受 / 拒绝。”
- 后续复制回来的副作用，也带着同一个 key，用来避免重复执行或触发回滚。

原理上它就是一个唯一 ID，但真正重要的是它把一串预测副作用绑定到了一起。

## 什么时候生成

### 1. 能力预测激活时

最典型的时机是客户端调用 `TryActivateAbility`，并以 `Local Predicted` 方式激活能力。

此时会发生：

1. 客户端生成新的 `PredictionKey`
2. 用它开启一个预测窗口
3. 在这个窗口里进行 GE 应用、标签修改、GameplayCue、Montage 等预测性副作用
4. 再把 key 通过 RPC 发给服务器

### 2. 能力内部开启新的预测窗口时

如果初始 `ActivateAbility` 已经结束，但后续因为输入释放、等待事件等还要继续预测，就需要新的预测窗口，例如 `FScopedPredictionWindow`。

【注意】初始 key 通常只在当前这次调用栈里有效。跨帧、Latent 节点、等待任务之后，往往就需要新 key。

## 客户端和服务器如何对齐

【重点】对齐过程本质上是“同一份副作用在两端共享同一把钥匙”。

流程可以简化成：

1. 客户端生成 key，并带着它执行本地预测
2. 客户端把 key 发给服务器
3. 服务器收到请求后，也把服务端产生的副作用关联到这个 key
4. 服务器通过确认 RPC 和后续复制，让客户端知道这个 key 已经被接受或拒绝

一个很关键的点是：

- 客户端发给服务器的 key 是有效的
- 服务器复制回客户端时，这个 key 只会发给**最初发起预测的那个客户端**
- 其他客户端看到的通常是无效 key

这也是为什么 `PredictionKey` 主要用来解决“本地预测玩家自己”的一致性问题，而不是让所有旁观客户端都理解你的预测细节。

## 失败回滚时会发生什么

【重点】如果服务器拒绝这个预测，客户端需要回滚与该 key 关联的预测副作用。

常见被回滚的内容包括：

- 预测激活的能力
- 预测应用的 GameplayEffect
- 预测添加的 GameplayTag
- 预测触发的 GameplayCue

你可以把它理解成“把这张单号下面的临时改动撤销掉”。

## 成功确认时又会发生什么

成功并不等于“什么都不用做”。

【重点】成功的关键是 **catch up**，不是简单保留客户端那份结果不管。

通常流程是：

1. 客户端已经先做了一份预测结果
2. 服务器也生成了权威结果并复制回来
3. 客户端发现复制回来的效果带着同一个 key
4. GAS 通过 key 判断这是“同一件事”，避免把应用逻辑再做一遍
5. 等复制追上后，客户端移除本地那份预测副作用，只保留服务器权威状态

这一步主要是为了解决：

- **Undo**：预测错了怎么撤销
- **Redo**：服务器结果回来时，如何避免再播一次特效、再加一次 Tag

## 和 GameplayEffect / GameplayCue 的关系

在 [[w/unreal/gas/gas-prediction|GAS Prediction]] 的支持范围里，`PredictionKey` 会关联这些副作用：

- GameplayAbility 激活
- GameplayEffect 应用
- GameplayTag 修改
- GameplayCue
- Montage

【注意】[[w/unreal/gas/execution-calculation|Execution Calculation]]、周期性效果、效果移除等并不是 GAS 里“天然完美预测”的部分，看到它们时要先确认是否真的走了可预测路径。

## 一个很容易踩的点

- 【注意】预测窗口通常很短，基本可以理解成“这次 `ActivateAbility` 的即时执行范围”。
- 【注意】如果你在等待任务回调里继续做会改游戏状态的事，往往要重新开 `FScopedPredictionWindow`。
- 【技巧】如果客户端预测的是“元属性伤害”，最后真正改血仍常在服务端权威链路里完成，见 [[w/unreal/gas/metaattributes|MetaAttributes]]。

## 关联笔记

- [[w/unreal/gas/gas-prediction|GAS Prediction]]
- [[w/unreal/gas/gameplayability|GameplayAbility]]
- [[w/unreal/gas/gameplayeffect|GameplayEffect]]
- [[w/unreal/gas/fgameplayabilitytargetdata|FGameplayAbilityTargetData]]