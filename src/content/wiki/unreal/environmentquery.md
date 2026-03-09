---
title: Test
description: 虚幻引擎中 EQS 的核心概念、Test 与 Context。
tags: [unreal, wiki, ai, eqs]
updated: 2025-05-08
---

通过更改不同的 检测点 generator 生成策略。
随后在这些点上执行 测试，获取最优的结果

## EQS 的整体结构

`Environment Query System` 的核心就是一句话：

**先生成候选项，再对候选项做筛选和打分，最后选出最优结果。**

通常由三部分组成：

- `Generator`：生成候选点或候选 Actor
- `Context`：给测试提供参照物
- `Test`：对候选项做过滤和评分

## Generator / Test / Context 的关系

### Generator

负责“候选项从哪里来”。

常见生成方式：

- 在查询者周围生成一圈点
- 沿导航网格撒点
- 直接把一批 Actor 当候选项

### Context

负责“相对于谁来判断”。

例如：

- 相对于查询者自己
- 相对于玩家
- 相对于当前锁定目标

### Test

负责“如何选出更好的候选项”。

比如：

- 离目标更近
- 能看到目标
- 有路径可达
- 不在危险区域

所以可以把 EQS 理解成：

`Generator` 提供待选答案，`Context` 提供参考系，`Test` 负责淘汰和排序。

# Test
## Trace
`Trace` 常用来判断候选点与目标之间是否被遮挡。

典型用途：

- 寻找能看到玩家的位置
- 选择没有障碍物阻挡的攻击点
- 判断某个掩体点是否真的能挡住视线

### Test Purpose
- Filter Only
- Score Only
- Filter and Score

常见的 Test 有：

- `Distance`：按距离筛选或打分
- `Dot`：比较方向夹角
- `Trace`：做视线或遮挡检测
- `Pathfinding`：检查导航可达性和路径成本
- `Overlap`：检查空间占用

`Test Purpose` 的理解：

- `Filter Only`：不参与评分，只负责淘汰
- `Score Only`：不淘汰，只参与排序
- `Filter and Score`：先筛再排

## 调试视图怎么读

调试时通常会看到一批候选点：

- 被过滤掉的点会变成无效候选
- 保留下来的点会按分数高低显示不同强度
- 最终选中的点通常会被明显高亮

重点不是死记颜色，而是看：

- 哪一层 Test 把点刷掉了
- 分数是被哪一个 Test 拉开的

![[w/unreal/environmentquery.png|EnvironmentQuery.png]]
# EnvironmentQueryContext
简单说，EnvironmentQueryContext（环境查询情境/上下文）是在虚幻引擎的 EQS（Environment Query System，环境查询系统）里，用来作为“参考目标”的一种对象/类，用于告诉查询“要围绕谁、相对于谁做测试”。

核心要点是：

- EQS 里的生成器会生成一堆“点”或“Actor”作为候选项（Items），而测试（Test）需要一个参照物来计算“距离谁最近”“谁能看到谁”等，这个参照物就是 Context。
    
- 引擎内置了一些 Context，比如“查询者自己”“采样到的 Item 本身”等，也可以通过蓝图或 C++ 继承 EnvQueryContext（或 EnvQueryContext_BlueprintBase）自定义 Context，例如“玩家角色”“所有敌人”“某个特定目标点”。
    
- 在测试节点里你会经常看到一个“Context”下拉框，选择的就是具体用哪种 EnvironmentQueryContext 作为这次测试的参考对象，从而决定如何给每个 Item 打分和筛选。
    

如果你习惯 Unity 类比，可以把 EnvironmentQueryContext 理解成“提供目标集合/位置给 AI 查询系统的一个策略类”，查询的生成和测试逻辑不变，只是通过不同的 Context，来切换相对谁去做距离、视线、覆盖等计算。

## 性能注意项

EQS 很强，但也不能乱开。

常见注意点：

- 不要对大量 AI 每帧跑复杂查询
- 先缩小 `Generator` 范围，再叠加 Test
- `Trace`、`Pathfinding` 这类测试通常更贵
- 能用 Service 降频更新，就不要每次决策都全量重跑

## 典型应用

- 找到离玩家最近且可达的攻击点
- 找到有掩体、但仍能观察目标的位置
- 给敌人选择巡逻点、撤退点、侧移点

这也是它经常和 [[w/unreal/制作敌人ai|制作敌人AI]] 配套出现的原因。