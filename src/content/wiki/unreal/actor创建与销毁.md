---
title: 上下文环境
description: 虚幻引擎中 Actor 的创建、生命周期与销毁流程。
tags: [unreal, wiki, actor, spawn, lifecycle]
updated: 2025-11-25
---

Actor 映射到Unity中就像是 GameObject。
继承于UObject，与UObject最大的不同是能挂载不同组件的能力。
在创建Actor之前要进行思考需不需要该Actor类，当需要挂载组件的时候再考虑创建Actor类。

## 创建
- NewObject

### BeginPlay
类似于Unity中的Start生命周期函数。
### Tick
相当于Update
### EndPlay

### Destroyed


# 上下文环境
假如需要创建Actor，那就需要一个上下文环境，这个上下文环境就是World

### [[w/unreal/check宏|check宏]]
```
UWorld* World = GetWorld();
check(World)
```
调试断言宏，监测到空指针直接终止
### [[w/unreal/checkf宏|checkf宏]]
跟check宏相似，但是在出现错误时，还会打印一条日志
### FActorSpawnParameters

![[w/unreal/actor创建与销毁.png|Actor创建与销毁.png]]

- SpawnCollisionHandlingOverride：当生成时遇到Collision时候的策略

## 如何销毁
### 直接销毁
Actor ->Destroy()
### 延迟销毁
Actor ->SetLifeSpan(2.0f)

## 模板声明

```
UPROPERTY(EditAnywhere, BluepringReadWrite,Category = "Spawning")
TSubclassOf<<ABirdActor> BirdActorPrefab;
```
## 为什么销毁的生命周期函数被拆解为了两个
因为EndPlay是为了释放当前Actor本身拥有的那些资源和组件。
销毁时可以传入枚举，表明原因这个Actor为什么被销毁掉
当需要在Actor内部 释放资源（如销毁动态创建的组件、停止音效）或保存状态时候，清理资源逻辑要写在EndPlay
![[w/unreal/actor创建与销毁-1.png|Actor创建与销毁-1.png]]

当释放完毕了，如果有别的逻辑想通知别的Actor被销毁掉则可以使用 Destroyed
当需要让 外部系统（如游戏模式、其他Actor）感知到该Actor的销毁并做出响应的时候，逻辑要写在Destroyed

Next： [[w/unreal/actorcomponent|ActorComponent]]