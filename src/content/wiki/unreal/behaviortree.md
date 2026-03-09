---
title: Behavior Tree (行为树) 概述
description: 虚幻引擎中用于创建模块化人工智能 (AI) 行为的框架。
tags: [Unreal, AI]
updated: 2025-05-04
---

# Behavior Tree (行为树) 概述

【重点】**行为树 (Behavior Tree, BT)** 是虚幻引擎中用于创建**模块化人工智能 (AI) 行为**的一种可视化脚本框架。它通过树状结构来组织一系列的任务、决策和条件，从而定义 AI 如何响应环境和内部状态的变化。行为树特别适合创建复杂的、可扩展的、易于调试的 AI 逻辑。

## 核心优势

*   **模块化**: 【重点】行为可以分解为小的、可重用的节点（任务、条件等），方便组合和修改。
*   **可视化**: 【技巧】通过可视化编辑器创建和编辑行为逻辑，直观易懂。
*   **响应性**: 行为树本质上是**事件驱动**的，每次执行都会从根节点开始重新评估，能够快速响应状态变化。
*   **可扩展性**: 容易添加新的行为节点（Tasks, Decorators, Services）来扩展 AI 能力。

## 核心组件

行为树由不同类型的节点组成，共同定义 AI 的决策流程：

1.  **Root (根节点)**: 【重点】行为树的入口点。每次行为树执行时，都从根节点开始向下遍历。
2.  **Composite Nodes (复合节点)**: 【重点】控制其子节点的执行顺序和逻辑。常见的复合节点包括：
    *   **Selector (选择器)**: 【重点】按顺序执行其子节点，**一旦有一个子节点执行成功，Selector 就立即成功返回**，不再执行后续子节点。如果所有子节点都失败，Selector 才失败。常用于实现"尝试做某事，如果不行就尝试下一件事"的逻辑（类似 `OR`）。
    *   **Sequence (序列器)**: 【重点】按顺序执行其子节点，**只有当所有子节点都成功执行时，Sequence 才成功返回**。一旦有子节点失败，Sequence 就立即失败返回，不再执行后续子节点。常用于实现一系列必须按顺序完成的动作（类似 `AND`）。
    *   **Parallel (并行节点)**: 允许同时执行多个子分支。其成功或失败的条件可以配置（例如，要求主任务成功，或者所有任务都完成）。【注意】并行执行并非真正的多线程，仍然在游戏主线程或 AI 线程中按顺序 Tick，但逻辑上允许几个分支同时处于"活动"状态。
3.  ** [[w/unreal/behavior-tree-decorator|Decorator Nodes]] (装饰器节点)**: 【重点】附加在 Composite Node 或 Task Node 上，作为**条件检查**或修改器，决定其附加的节点是否可以执行或如何执行。如果 Decorator 条件不满足，其下的整个分支（或任务）将被跳过。
    *   常见的 Decorators 包括：[[w/unreal/blackboardcondition|BlackBoard]] (检查黑板键值), `Cooldown` (冷却时间), `Time Limit` (执行时间限制), `Force Success/Failure` (强制改变结果), `Loop` (循环执行)。
    *   【技巧】Decorator 是实现行为树**条件逻辑**的核心。
4.  **Task Nodes (任务节点)**: 【重点】行为树的**叶子节点**，代表 AI 执行的具体原子操作。这些是实际"做事"的节点。
    *   常见的 [[w/unreal/bttask|Tasks]] 包括：`Move To` (移动到目标位置), `Wait` (等待一段时间), `Play Animation` (播放动画), `Rotate to face BB entry` (转向黑板中的目标), 以及自定义的 C++ 或蓝图任务。
    *   任务执行完成后会返回 **Success (成功)** 或 **Failure (失败)**，影响上层 Composite Node 的决策。有些任务可能是**持续性的**，直到某个事件发生或被中止。
5.  **Service Nodes (服务节点)**: 【重点】附加在 Composite Node 上。**只要该 Composite Node 及其下的分支正在被执行（处于活动状态），Service 就会按照设定的频率周期性地执行**。常用于执行那些需要在特定行为模式下**持续进行**的检查或更新。
    *   常见的 Services 包括：环境查询 (EQS), 更新黑板值 (如检查敌人是否在视野内并更新黑板), 调整 AI 属性等。
    *   【注意】Service 的执行频率可以调整，避免不必要的性能开销。你之前的笔记提到"可以决定 Tick 的频率"指的就是 Service 的更新频率。
    *   【技巧】Service 不直接影响行为树的流程控制（即它不返回 Success/Failure 来打断流程），而是用于后台更新或检查。

## Blackboard (黑板)

【重点】**[[w/unreal/blackboard|Blackboard]]** 是与行为树配合使用的**数据存储**组件，可以看作是 AI 的"记忆体"。行为树通过 Blackboard 来存储和读取 AI 感知到的信息、目标、状态等数据。

*   **键值对**: Blackboard 以键值对 (Key-Value) 的形式存储数据，Key 是名称 (FName)，Value 可以是各种类型（Object, Vector, Float, Bool, Enum 等）。
*   **数据驱动**: Decorator 通常检查 Blackboard 中的值来做决策，Task 则可能读取 Blackboard 值作为参数（如移动目标位置），或修改 Blackboard 值来反映动作结果。
*   【技巧】使用 Blackboard 可以让行为树逻辑与具体的数据分离，提高复用性。例如，一个通用的"攻击敌人"子树可以通过 Blackboard 获取当前的敌人目标，而不需要硬编码。



## 执行流程

*   **Tick**: 行为树通常由 `AIController` 中的 `BehaviorTreeComponent` 驱动，按一定频率（通常不是每一帧，可以配置）执行 Tick。
*   **从根开始**: 每次 Tick，执行流程**从 Root 节点开始**，根据 Composite Node 的类型和 Decorator 的条件，自顶向下、从左到右遍历树，直到找到一个可以执行的 Task。
*   **状态变化**: 当一个 Task 完成（成功或失败），或者 Decorator 条件变化，或者 Blackboard 值被修改时，下一次 Tick 可能会导致执行流程进入树的不同分支。
*   **重新评估**: 【重点】行为树的强大之处在于它的**响应性**。即使 AI 正在执行一个长序列的中间步骤，如果更高优先级的 Selector 分支的 Decorator 条件突然满足了（例如，玩家进入视野），行为树会立即切换到该高优先级分支。

## 与其他概念的关系

*   **AIController**: 【重点】通常由 `AIController` 拥有并运行 `BehaviorTreeComponent`。
*   **Pawn**: AIController 控制一个 `Pawn`，行为树中的 Task 最终会操作这个 Pawn（移动、播放动画等）。
*   **Perception Component (感知组件)**: 【技巧】AI 的感知系统（如视觉、听觉）通常会将其感知到的信息写入 Blackboard，供行为树使用。
*   **Environment Query System (EQS)**: 【技巧】EQS 用于执行复杂环境查询（如寻找最佳躲藏点、寻找最近的补给点），查询结果通常写入 Blackboard，然后行为树根据结果执行相应 Task。

## 工程师思维框架

*   **问题定义**: 如何为 AI 设计复杂、分层、可响应环境变化的决策逻辑？
*   **原理分析**: 使用树状结构组织行为，通过 Composite Node 控制流程，Decorator 控制条件，Task 执行动作，Service 执行周期性更新，Blackboard 存储状态。
*   **解决方案**: 设计行为树结构，创建自定义的 Task, Decorator, Service 节点（蓝图或 C++），配置 Blackboard 资源，并在 AIController 中运行该行为树。
*   **优化迭代**:
    *   【注意】保持行为树的层级不要过深，过于复杂的树难以调试和维护。
    *   【技巧】善用子树 (Run Behavior 节点) 来封装可复用的行为逻辑。
    *   【技巧】合理设置 Service 的更新频率和 Decorator 的检查时机（On Value Change / On Result Change）以优化性能。
    *   【重点】使用 Visual Logger (`vislog` 控制台命令) 来调试行为树的执行流程。
*   **经验总结**: 行为树是 Unreal 中构建复杂 AI 的强大工具，掌握其核心组件和执行逻辑是 AI 开发的关键。Blackboard 是行为树的"大脑"，有效利用 Blackboard 是设计高效 AI 的核心。

## 资源推荐

*   【例子】官方文档：[Behavior Trees Overview](https://docs.unrealengine.com/en-US/InteractiveExperiences/AI/BehaviorTrees/Overview/index.html)
*   【例子】官方示例内容中的 AI 角色通常会使用行为树。