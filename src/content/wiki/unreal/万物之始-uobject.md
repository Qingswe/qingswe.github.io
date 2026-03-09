---
title: 万物之始 UObject
description: 从命名、创建到 GC，梳理 UObject 在 Unreal 中的基础定位。
tags: [unreal, post, uobject, reflection, gc]
updated: 2025-11-25
---

## 这篇想回答什么

刚开始学 Unreal 时，`UObject` 很容易被看成“又一个基础类”，但它其实是整套对象系统的起点。

如果带着 Unity 的习惯来看，最先冒出来的问题通常是：

- 为什么新建类名前面经常要加一个 `U`
- `UObject` 和 [[w/unreal/actor|Actor]] 到底是什么关系
- 为什么创建出来的对象有时会被莫名其妙回收
- `UPROPERTY`、`Outer`、`AddToRoot()` 这些东西到底在解决什么

这篇就顺着这几个问题往下讲。

## 为什么类名前面要加一个 U

这是 Unreal 官方约定的一部分。只要一个类继承自 `UObject`，命名上通常就会使用 `U` 前缀，比如 `UItemObject`、`UGameInstance`、`UUserWidget`。

对应地：

- `A` 前缀通常给 `Actor`
- `F` 前缀通常给普通结构体
- `E` 前缀通常给枚举

所以看到类名前缀时，基本就能先判断它大概属于哪一类对象系统。

## 先把 UObject 看成什么

我更倾向于把 `UObject` 理解成 Unreal 版的“基础对象模型”。

它和 Unity 的 `Object` 确实有一点像，但 `UObject` 承担得更多。很多引擎核心能力都建立在它上面，比如：

- 垃圾回收
- 反射系统
- 序列化
- 元数据支持
- 运行时类型识别
- 编辑器集成
- 网络复制相关能力

所以 `UObject` 不是“场景里的东西”，而是让对象接入 Unreal 引擎体系的入口。

## 无法绕过的核心六大类

如果只是想先建立整体感觉，我觉得最绕不过去的是这六类：

- `UObject`
- [[w/unreal/actor|Actor]]
- [[w/unreal/actorcomponent|ActorComponent]]
- [[w/unreal/pawn|Pawn]]
- [[w/unreal/character|Character]]
- `Controller`

它们可以粗略地理解成这样：

- `UObject` 负责对象系统本身
- `Actor` 负责进入世界
- `ActorComponent` 负责把能力挂到 `Actor` 身上
- `Pawn` 负责“可被控制”的实体
- `Character` 是带角色运动系统的 `Pawn`
- `Controller` 负责输入、决策和控制权

把这六个点连起来之后，后面很多系统就不再是碎片。

## UObject 和 Actor 的差别

这个问题最容易混淆。

`Actor` 继承自 `UObject`，但它比 `UObject` 多了一层“存在于世界里”的能力。

`UObject`：

- 不直接存在于 `World`
- 默认没有位置、旋转、缩放
- 不能直接放进关卡
- 更适合做数据对象、配置对象、运行时逻辑对象

`Actor`：

- 会真正出现在关卡或世界里
- 有变换信息
- 能被 `Spawn`、销毁、复制
- 能挂组件、参与碰撞、渲染和 Tick

如果要拿 Unity 做对照，`Actor` 更接近 `GameObject`，而 `UObject` 更接近“很多系统共同依赖的基础对象类型”。

## 生命周期要怎么理解

`BeginPlay -> Start`，这个对照本身没问题，但更准确地说，这是 [[w/unreal/actor|Actor]] 的生命周期入口，更接近 Unity 的 `Start()`。

`UObject` 自己默认没有 `BeginPlay`、`Tick` 这种世界生命周期函数。它的生命周期更像是：

1. 被创建出来
2. 被某个引用链持有
3. 不再可达后等待 GC
4. 进入销毁流程

所以理解 `UObject` 时，不要先从“场景对象会怎么跑”去想，而要先从“它被谁持有、什么时候会被回收”去想。

## 如何创建一个新的 UObject

最常见的方式就是 `NewObject<>()`：

```cpp
UItemObject* ItemObject = NewObject<UItemObject>();
```

如果你希望它跟着某个父对象一起管理生命周期，通常会传入 `Outer`：

```cpp
UItemObject* ItemObject = NewObject<UItemObject>(this);
```

这里的 `Outer` 可以先理解成“归属容器”。

一个常见用法是把 `Actor` 作为 `Outer` 传进去。这样当这个 `Actor` 生命周期结束时，这个 `UObject` 也更容易随着它一起进入回收链路。

## 为什么 Outer 很重要

`Outer` 不只是语法参数，它决定了对象在 Unreal 对象树里的归属关系。

很多初学者第一次创建 `UObject` 时会忽略这一点，结果就是对象虽然创建成功了，但因为没有被正确持有，很快就被 GC 清掉了。

所以经验上可以先记一条：

- 这个对象本来就属于某个宿主时，优先给它一个合理的 `Outer`
- 如果它需要被成员变量长期持有，就配合 [[w/unreal/uproperty|UPROPERTY]]
- 如果它必须脱离常规引用链独立活着，才考虑 `AddToRoot()`

## UPROPERTY 为什么这么重要

如果一个成员变量要引用 `UObject`，通常不能只写普通裸指针。

```cpp
UPROPERTY()
UItemObject* ItemObject;
```

原因不是“语法更完整”，而是这样这个引用关系才能被 Unreal 的反射和 GC 系统追踪到。

如果只是这样写：

```cpp
UItemObject* ItemObject;
```

那这个指针虽然在 C++ 里存在，但 GC 不一定知道它是一个有效引用。结果就是对象可能被意外回收，最后你手里留下一个失效指针。

## 三种常见的不被提前回收的方式

结合你 Notion 里的例子，可以把常见做法总结成三类。

### 1. 传入 Outer，让对象跟随宿主

```cpp
UItemObject* ItemObject = NewObject<UItemObject>(this);
```

这适合“这个对象本来就属于当前对象”的场景。

### 2. 添加到 Root，强行阻止回收

```cpp
UItemObject* ItemObject = NewObject<UItemObject>();
ItemObject->AddToRoot();
```

这种方式会把对象加入根集合，只要不移除，GC 就不会回收它。

对应地，如果后面想允许它被回收，需要先：

```cpp
ItemObject->RemoveFromRoot();
```

这个动作应该发生在你标记对象进入回收流程之前。

### 3. 用 UPROPERTY 维护引用关系

```cpp
UPROPERTY()
UItemObject* ItemObject;

ItemObject = NewObject<UItemObject>(this);
```

这是工程里最常见、也最自然的一种方式。因为它不是“强行保活”，而是把对象纳入正常的引用管理。

## 前置声明

如果只是要声明一个指针或引用，通常可以先做前置声明，不急着包含头文件：

```cpp
class UItemObject;
```

这样可以减少不必要的头文件依赖，避免编译变慢。只有当你真的需要访问完整类型定义时，再去 `#include` 对应头文件。

## 两种常见的销毁方式

多数情况下，`UObject` 不需要你手动 `delete`，更不应该直接 `delete`。

如果确实要主动让它进入回收流程，常见会看到这两种写法：

```cpp
ItemObject->ConditionalBeginDestroy();
```

或者：

```cpp
ItemObject->MarkAsGarbage();
```

可以先这样理解：

- `ConditionalBeginDestroy()` 更像是尝试启动销毁流程
- `MarkAsGarbage()` 是把对象标记成待回收，等下一次 GC 处理

但平时最稳妥的原则还是一样：优先让它失去有效引用，由引擎正常回收；只有在你明确知道对象状态时，再去手动推进销毁。

另外，如果这个对象之前调用过 `AddToRoot()`，那在销毁前一定要先 `RemoveFromRoot()`，否则它根本不会进入正常回收。

## 重写 BeginDestroy 的意义

当一个 `UObject` 持有的不只是普通值类型，而是一些需要额外清理的资源时，就可能需要重写 `BeginDestroy()`。

比如它内部持有某些资源句柄、纹理引用或者其他需要显式释放的内容，这时就可以在这里安排回收前的清理逻辑。

如果只是普通值对象，通常交给正常 GC 就够了；如果牵涉到更复杂的资源释放，就要认真设计 `BeginDestroy()` 里的行为。

## 最后把它记成一句话

`UObject` 不是给你“摆进场景”的对象，而是给你“接入 Unreal 对象系统”的对象。

只要把这句话记住，后面再看 [[w/unreal/actor|Actor]]、[[w/unreal/actorcomponent|ActorComponent]]、[[w/unreal/pawn|Pawn]]、[[w/unreal/character|Character]]，层级关系就会顺很多。

Next:
[[w/unreal/actor|Actor]]