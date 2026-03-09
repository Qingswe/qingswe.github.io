---
title: BlackBoard
description: 行为树中 BlackBoard 的作用与关键配置项。
tags: [unreal, wiki, behavior-tree, blackboard]
updated: 2025-05-06
---

在BlackBoard对象中，可以添加 Key

### Instance Synced
这个黑板的所有实例之间同步，有点像是这个黑板的static类型，在使用这个黑板组件的对象之间共享

## BlackBoard 的定位

`BlackBoard` 是行为树配套的数据中心，可以把它理解成 AI 的“短期记忆”。

行为树本身负责决策流程，黑板负责存当前状态和输入数据，例如：

- 当前目标是谁
- 是否看见敌人
- 巡逻点在哪
- 是否进入攻击范围
- 最近一次查询出的躲避点

## 为什么需要它

如果没有黑板，Task 和 Decorator 之间就得互相硬编码传值。

有了黑板之后：

- 感知系统可以写入数据
- [[w/unreal/behavior-tree-decorator|Behavior Tree Decorator]] 读取条件做判断
- [[w/unreal/bttask|BTTask]] 读取目标并执行动作
- `Service` 可以周期性更新值

这会让 AI 逻辑更像“数据驱动”而不是“节点之间互相耦合”。

## 常见 Key 类型

黑板 Key 可以是多种类型，常用的有：

- `Bool`
- `Int`
- `Float`
- `Enum`
- `Vector`
- `Object`
- `Class`
- `Name`
- `String`
- `Rotator`

最常见的是：

- `Object`：当前敌人、目标 Actor
- `Vector`：目的地、巡逻点、EQS 结果点
- `Bool`：是否发现玩家、是否在攻击范围

## 和 Behavior Tree 的协作方式

一条典型链路通常是：

1. `AI Perception` 或 `Service` 发现玩家
2. 把目标写进黑板，例如 `TargetActor`
3. Decorator 检查 `TargetActor Is Set`
4. Task 读取 `TargetActor` 执行追击或攻击

所以黑板不是“额外的配置表”，而是行为树运行时的共享上下文。

## `Instance Synced`

这个选项表示该 Key 是否在多个黑板实例之间同步。

可以粗略理解成“共享态”：

- 开启后，多个使用同一黑板资源的实例可能共享这项数据
- 关闭后，更像每个 AI 自己维护自己的状态

大多数敌人个体状态不应该共享，所以这个选项通常要谨慎开启。

## 调试方法

- 打开行为树调试视图，观察当前 AI 的黑板面板
- 看 Key 是否真的被写入，而不是只检查 Task 有没有执行
- 对目标丢失、状态切换异常的问题，优先怀疑黑板值是否更新不及时

## 经验

- Key 名称要清晰，例如 `TargetActor`、`MoveLocation`、`bCanAttack`
- 不要把所有状态都塞进黑板，只放“决策需要共享”的数据
- 黑板结构混乱时，行为树一定会越来越难维护