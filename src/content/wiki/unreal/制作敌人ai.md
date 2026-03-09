---
title: 制作敌人AI
description: 基于行为树与 EQS 搭建敌人 AI 的实践笔记。
tags: [Unreal, AI]
updated: 2025-05-08
---

![Aura-Home.png](/images/unreal/Aura-Home.png)
创建AuraAIController，添加[[w/unreal/behaviortree|BehaviorTree]]Component
编辑器中创建 EnemyBase行为树的蓝图，BlackBoard AIController上拥有一个。

## EnvironmentQuerySystem
敌人会检查身边的环境，比如在攻击玩家的轨道之间拥有障碍物的话就会更换位置和角度。
实现的一种方法是使用虚幻引擎的 Environment Query System。运行[[w/unreal/environmentquery|EnvironmentQuery]]时候，可以使用Generator，在某个点周围生成一组location或者actor，称为items，随后在items上执行一系列用户定义的测试，进行打分并选择最优的item
![制作敌人AI-2.png](/images/unreal/制作敌人AI-2.png)

## 目标

这套敌人 AI 的目标不是“能动起来”就结束，而是让敌人在战斗里具备三件事：

- 能找到玩家
- 能根据状态切换巡逻、追击、攻击
- 当位置不好时，能自己找更合适的站位

也就是把 AI 从静态触发器，做成一个能持续决策的战斗单位。

## 整体结构

我这里采用的是 Unreal 比较标准的一套组合：

- `Enemy Character`：负责角色表现、动画、属性
- `AuraAIController`：运行 [[w/unreal/behaviortree|BehaviorTree]]
- [[w/unreal/blackboard|BlackBoard]]：保存目标、状态、移动点
- [[w/unreal/bttask|BTTask]] / [[w/unreal/behavior-tree-decorator|Behavior Tree Decorator]]：组织行为逻辑
- [[w/unreal/environmentquery|EnvironmentQuery]]：在需要换位时寻找更优位置

这套结构的优点是职责比较清晰：

- 感知和状态写进黑板
- 行为树只负责决策
- 角色本体只负责执行

## 黑板设计

一开始最重要的是先把黑板 Key 定清楚，不然行为树会越写越乱。

这里至少需要几类数据：

- `TargetActor`：当前锁定的玩家
- `MoveLocation`：EQS 或巡逻系统算出的目标点
- `bHasLineOfSight`：是否有视线
- `bInAttackRange`：是否进入攻击范围
- `CombatState`：当前战斗状态

这些 Key 决定了后面 Task 和 Decorator 怎么解耦。

## 行为树结构

一个可维护的基本结构通常是：

1. 高优先级：发现玩家并可攻击时，进入攻击分支
2. 中优先级：发现玩家但站位不好时，执行追击或换位
3. 低优先级：没有目标时巡逻或待机

其中高优先级分支会大量依赖 `Blackboard Decorator`：

- `TargetActor Is Set`
- `bInAttackRange == true`
- `bHasLineOfSight == true`

这样能保证 AI 不是死板走流程，而是随着目标状态即时切换。

## EQS 的使用方式

EQS 主要解决的问题是：**敌人不只是“追过去”，而是要找到一个更适合输出的位置。**

我的理解是把它用在这些场景最有价值：

- 玩家和敌人之间有障碍物，需要重新找视角
- 敌人想保持一个施法距离，而不是脸贴脸
- 敌人要绕开被占用的位置

实现上通常会：

1. 以敌人或目标为 `Context`
2. 通过 `Generator` 在周围生成候选点
3. 用 `Trace`、`Distance`、`Pathfinding` 等 Test 过滤并打分
4. 把最优点写入 `MoveLocation`
5. 让 `Move To` 或自定义 Task 执行移动

## 实现步骤

### 1. 建 AIController

- 创建 `AuraAIController`
- 添加并启动 `BehaviorTreeComponent`
- 绑定对应的 Blackboard 资源

### 2. 角色上接入控制器

- 给敌人角色设置 AIControllerClass
- 确保角色能被导航系统驱动

### 3. 配黑板

- 先把核心 Key 配好
- 不要一上来把所有状态都塞进去

### 4. 搭行为树

- 先跑通巡逻 -> 追击 -> 攻击三段主流程
- 再补充打断逻辑和异常分支

### 5. 加 EQS

- 当攻击位置不理想时，查询新的站位
- 查询结果写回黑板
- 用移动 Task 消费结果

## 踩过的坑

- 黑板值虽然设计了，但没在正确时机更新，结果行为树永远卡在旧状态
- 只会 `Move To` 玩家，导致 AI 缺乏“战斗位移感”
- Decorator 的中止策略配错后，AI 要么不切状态，要么频繁抖动
- EQS 测试过多时，调试起来会很难看出是哪一层把点刷掉了

## 最终效果判断标准

这类敌人 AI 做完后，我更关心的不是“节点很多”，而是下面这几件事有没有成立：

- 目标出现时能快速切到战斗状态
- 目标消失后能退回巡逻或警戒
- 被障碍物挡住时会主动调整位置
- 攻击、追击、换位之间切换自然

如果这几点成立，说明这套行为树和 EQS 结构已经具备继续扩展的基础。