---
title: BlackBoardCondition
description: 黑板条件装饰器中的观察模式与分支中止策略。
tags: [Unreal, AI]
updated: 2025-05-06
---

### NotifyObserver

- OnValueChange 
- OnResultChange 结果变化时通知观察者
### Observer aborts
- None 无操作
- Self 中止自身
- Lower Priority 比自身低的优先级
	优先级是行为树节点右边的红色小圆圈标记
	![BlackBoardCondition](/images/unreal/BlackBoardCondition.png)
- Both

## `Notify Observer` 的区别

### `On Value Change`

只要这个黑板值本身发生变化，就会触发重新观察。

适合：

- `TargetActor` 从空变成有值
- 目标点位置变化
- 枚举状态切换

它关注的是“数据变了没”，不管判断结果有没有变。

### `On Result Change`

只有条件判断结果发生变化时才触发。

例如一个 Decorator 判断“目标是否存在”：

- `TargetActor` 从 A 换成 B，结果仍然是“存在”时，不一定触发切换
- `TargetActor` 从有值变空，结果从真变假，才会触发

它关注的是“条件真假有没有变化”。

## `Observer Aborts` 的典型理解

### `None`

只在节点进入时检查，不主动中止已经运行的分支。

适合：

- 不敏感的低频条件
- 不想频繁打断行为的流程

### `Self`

条件失效时，中止当前分支自身。

典型场景：

- 攻击分支要求“目标在攻击范围内”
- 一旦超出范围，立刻打断当前攻击流程

### `Lower Priority`

当当前 Decorator 所在分支条件满足时，中止右侧更低优先级分支。

典型场景：

- 左侧高优先级分支是“发现玩家则追击”
- 右侧低优先级分支是“巡逻”
- 一旦发现玩家，立刻打断巡逻

### `Both`

同时具备 `Self` 和 `Lower Priority` 的效果。

适合：

- 条件变化需要双向打断的分支
- 战斗中高优先级状态切换较多的场景

## 一个常见例子

假设 `Selector` 下有两个分支：

1. `CanSeePlayer` -> 追击玩家
2. 巡逻

如果 `CanSeePlayer` 的 Decorator 配成：

- `Notify Observer = On Result Change`
- `Observer Aborts = Lower Priority`

那么“看见玩家”的瞬间就会打断巡逻。

如果同时还希望“失去视野”时中止追击分支，再退回巡逻，通常会配 `Both`。

## 使用经验

- 条件是 Bool 还是 Object Is Set，会影响触发频率和直觉
- `On Value Change` 更积极，`On Result Change` 更稳
- AI 行为切不回来、或者频繁抖动，优先检查这里的组合