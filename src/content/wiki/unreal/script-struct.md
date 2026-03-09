---
title: Script Struct
description: 虚幻引擎中 Script Struct 与反射系统的关系。
tags: [Unreal, C++]
updated: 2025-05-01
---

当创建一个能够暴露给反射系统的机构体时，反射系统会为其创建一个脚本结构体。
可以把这个脚本结构体视作该结构体的反射，就像 [[w/unreal/gas/attributes/uclass|UClass]] 是 [[w/unreal/万物之始-uobject|万物之始 UObject]] 的反射一样。

## 对应的反射对象

当我们写：

```cpp
USTRUCT(BlueprintType)
struct FDamageInfo
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Damage = 0.f;
};
```

引擎会为它生成对应的 `UScriptStruct` 元数据对象，用于：

- 让编辑器识别这个结构体
- 让蓝图读写字段
- 支持序列化、复制、DataTable、细节面板展示

所以 `UScriptStruct` 不是你手写出来的业务结构体，而是它在反射系统中的“描述对象”。

## USTRUCT 的作用

如果一个结构体只是普通 C++ `struct`，那它只是编译器层面的数据布局。

如果加上 `USTRUCT`，它就进入了 Unreal 的工具链，能获得：

- 反射
- 序列化
- 蓝图可见性
- 属性编辑器支持
- 网络复制和存档系统的接入能力

## 和普通 C++ struct 的差异

普通 `struct`：

- 编译快
- 不依赖反射
- 不能直接暴露给编辑器和蓝图

`USTRUCT`：

- 需要 `GENERATED_BODY()`
- 字段通常配合 [[w/unreal/uproperty|UPROPERTY]]
- 可以用于蓝图、DataTable、SaveGame 等系统

如果只是内部临时数据，不需要反射，不一定要强行写成 `USTRUCT`。

## 常见说明符

- `BlueprintType`：允许该结构体作为蓝图变量类型
- 字段通过 `UPROPERTY(EditAnywhere, BlueprintReadWrite)` 暴露给编辑器和蓝图

## 常见使用场景

- 技能配置
- 存档数据
- DataTable 行结构
- 属性快照
- 网络消息或复制数据

## 理解重点

可以把 Unreal 的结构体拆成两层看：

- 业务层：你写的 `FDamageInfo`
- 反射层：引擎生成的 `UScriptStruct`

这个视角很重要，因为很多“为什么这个结构体不能出现在蓝图里”的问题，本质上都是没有正确进入反射系统。