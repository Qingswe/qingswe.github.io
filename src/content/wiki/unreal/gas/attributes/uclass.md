---
title: UClass
description: UClass 是 UObject 类型在反射系统中的运行时描述对象。
tags: [unreal, wiki, reflection, uclass]
updated: 2025-05-01
---

# UClass

【重点】`UClass` 是每个 `UObject` 派生类型在虚幻反射系统中的运行时描述对象。你写的是 C++ 类或蓝图类，但引擎在运行时真正拿来做反射、构造、序列化和类型判断的，是这份 `UClass` 元信息。

## UClass 的职责

`UClass` 主要负责描述一个类型“是什么、能做什么、默认长什么样”。

它里面会关联到很多关键信息，例如：

- 类名、父类关系
- 属性列表（`UPROPERTY`）
- 函数列表（`UFUNCTION`）
- 默认对象 `CDO`
- 构造、反射、序列化所需的元数据

【重点】所以 `UClass` 不是“某个实例”，而是“这个类型本身的运行时说明书”。

## 如何从实例拿到 UClass

最常见的方法是：

```cpp
UClass* Class = SomeObject->GetClass();
```

除此之外还常见：

- `AMyCharacter::StaticClass()`：直接拿某个类型对应的 `UClass`
- `Obj->IsA(AMyCharacter::StaticClass())`：判断实例是否属于某类
- `TSubclassOf<ABaseEnemy>`：在编辑器或代码中限制“必须是某个基类的子类”

## 它为什么重要

很多引擎能力都依赖 `UClass`：

- 通过类生成对象
- 在编辑器里暴露可选蓝图类
- 运行时做类型判断和反射调用
- 访问类默认对象（CDO）读取默认配置

【例子】当你在属性面板里填一个“敌人蓝图类”，底层通常存的就是某个 `UClass` 引用，而不是一个实例。

## UClass、UScriptStruct、UFunction 的关系

它们都属于反射系统的元对象，但负责的范围不同：

- `UClass`：描述 `UObject` / `AActor` / `UActorComponent` 这类类
- `UScriptStruct`：描述 `USTRUCT` 结构体
- `UFunction`：描述函数签名、参数和反射调用信息

可以把它们理解成同一套反射系统里的三类“说明书”。

## 一个容易混淆的点

【注意】`UClass` 和对象实例不是一回事。

- 实例有运行时状态，例如当前位置、当前血量
- `UClass` 只描述类型本身，例如这个类有哪些属性和函数

很多初学阶段会把“我拿到一个 `UClass*`”误解成“我拿到了这个对象本身”，这两者要分清。

## 实战里常见的用法

- 暴露 `TSubclassOf<>` 给编辑器配置
- 根据 `UClass` 动态生成对象
- 通过 `GetClass()` 做调试和类型判断
- 读取 `GetDefaultObject()` 看默认配置

## 关联笔记

- [[1 - Projects/Unreal/万物之始 UObject|UObject]]
- [[w/unreal/gas/attributes/ufunction|UFUNCTION]]