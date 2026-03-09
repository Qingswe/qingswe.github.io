---
title: BTTask
description: 行为树中 BTTask 节点的职责、入口函数与延迟任务要点。
tags: [unreal, wiki, behavior-tree, task]
updated: 2025-05-07
---

## BTTask 的职责

`BTTask` 是行为树真正“做事”的叶子节点。

常见用途：

- 移动到目标点
- 播放攻击动画
- 设置黑板值
- 发起技能
- 请求一次 EQS 查询

它和 [[w/unreal/behavior-tree-decorator|Behavior Tree Decorator]] 的区别是：

- `Decorator` 负责判断“能不能做”
- `Task` 负责真正执行“去做什么”

## 返回值

C++ 自定义任务最关键的返回值是 `EBTNodeResult::Type`：

- `Succeeded`：任务成功完成
- `Failed`：任务失败
- `InProgress`：任务还没结束，后续会异步结束

这个返回值会直接影响上层 `Sequence` 或 `Selector` 如何继续执行。

## C++ 中常见入口

### `ExecuteTask`

同步任务的主要入口：

```cpp
virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;
```

适合：

- 立即写一个黑板值
- 做一次条件判断
- 触发一个同步逻辑

如果逻辑可以在这一帧完成，就直接返回 `Succeeded` 或 `Failed`。

### `AbortTask`

当分支被中止时调用：

```cpp
virtual EBTNodeResult::Type AbortTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;
```

适合：

- 停止移动
- 取消技能
- 解绑委托
- 清理临时状态

### `TickTask`

如果任务需要持续更新，可以开启 Tick：

```cpp
bNotifyTick = true;
```

然后实现：

```cpp
virtual void TickTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds) override;
```

## 同步任务和 Latent Task 的区别

### 同步任务

特点：

- 在 `ExecuteTask` 里就能得出结果
- 立即返回 `Succeeded` 或 `Failed`
- 逻辑简单、成本低

例如：

- 更新一个黑板 Key
- 检查一次距离
- 切换一个状态

### Latent Task

特点：

- 任务需要等待一段时间或某个回调
- `ExecuteTask` 先返回 `InProgress`
- 之后再手动结束任务

例如：

- 等待蒙太奇播放结束
- 等移动完成
- 等异步查询或技能命中结果

## `FinishLatentTask`

Latent Task 最关键的是在合适时机手动结束：

```cpp
FinishLatentTask(OwnerComp, EBTNodeResult::Succeeded);
```

如果不调用结束函数，行为树会一直认为这个 Task 还在执行中。

## `NodeMemory`

延迟任务经常需要保存过程数据，这时就会用到 `NodeMemory`。

适合放进去的数据：

- 是否已经发起请求
- 临时句柄
- 计时器状态
- 等待中的目标引用

典型做法是：

1. 定义一个小型 `struct`
2. 重写 `GetInstanceMemorySize()`
3. 在 `ExecuteTask` / `TickTask` / `AbortTask` 中读写这块内存

这样可以避免把任务运行时状态错误地塞进共享对象本身。

## 蓝图任务和 C++ 任务

蓝图里常见的是继承 `BTTask_BlueprintBase`：

- `ReceiveExecuteAI`
- `ReceiveAbortAI`
- `FinishExecute`
- `FinishAbort`

C++ 更适合：

- 复杂逻辑
- 高复用任务
- 需要更细粒度控制的异步流程

蓝图更适合：

- 快速搭原型
- 简单流程编排
- 偏设计侧的行为拼装

## 实践经验

- 能同步完成的任务就不要写成 Latent
- Latent Task 必须明确“谁来结束它”
- 中止分支时，记得把移动、计时器、委托一起清干净
- 参数通常来自 [[w/unreal/blackboard|BlackBoard]]，不要把任务写成强耦合硬编码