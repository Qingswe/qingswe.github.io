---
title: NetSerialize
description: NetSerialize 决定结构体如何在网络复制中自定义序列化。
tags: [unreal, wiki, serialization, network]
updated: 2025-05-02
---

## PackageMap
存储 序列化中 每个元素的读取索引 
![[w/unreal/netserialize.png|NetSerialize.png]]
使用了位运算来处理序列化所属的数值，使用|=判断是否需要序列化，&=判断哪些部分可以被应用，然后将需要的数据通过移位填入字节数组中
[[w/unreal/gas/related/tstructopstypetraits|TStructOpsTypeTraits]]
这些TStructOpsTypeTraits 定义了能对特定的结构体FGameplayEffectContext 执行的操作，定义了[[w/unreal/script-struct|Script Struct]]能够做什么
```cpp
bool FGameplayEffectContext::NetSerialize(FArchive& Ar, class UPackageMap* Map, bool& bOutSuccess)  
{  
    //!!!!!!!!!!!!!!!! Warning !!!!!!!!!!!!!!!  
    // Any changes to this function also need to be done to FGameplayEffectContextNetSerializer to support Iris replication    //!!!!!!!!!!!!!!!! Warning !!!!!!!!!!!!!!!  
    uint8 RepBits = 0;  
    if (Ar.IsSaving())  
    {       if (bReplicateInstigator && Instigator.IsValid())  
       {          RepBits |= 1 << 0;  
       }       if (bReplicateEffectCauser && EffectCauser.IsValid() )  
       {          RepBits |= 1 << 1;  
       }       if (AbilityCDO.IsValid())  
       {          RepBits |= 1 << 2;  
       }       if (bReplicateSourceObject && SourceObject.IsValid())  
       {          RepBits |= 1 << 3;  
       }       if (Actors.Num() > 0)  
       {          RepBits |= 1 << 4;  
       }       if (HitResult.IsValid())  
       {          RepBits |= 1 << 5;  
       }       if (bHasWorldOrigin)  
       {          RepBits |= 1 << 6;  
       }    }  
    Ar.SerializeBits(&RepBits, 7);  
  
    if (RepBits & (1 << 0))  
    {       Ar << Instigator;  
    }    if (RepBits & (1 << 1))  
    {       Ar << EffectCauser;  
    }    if (RepBits & (1 << 2))  
    {       Ar << AbilityCDO;  
    }    if (RepBits & (1 << 3))  
    {       Ar << SourceObject;  
    }    if (RepBits & (1 << 4))  
    {       SafeNetSerializeTArray_Default<31>(Ar, Actors);  
    }    if (RepBits & (1 << 5))  
    {       if (Ar.IsLoading())  
       {          if (!HitResult.IsValid())  
          {             HitResult = TSharedPtr<FHitResult>(new FHitResult());  
          }       }       HitResult->NetSerialize(Ar, Map, bOutSuccess);  
    }    if (RepBits & (1 << 6))  
    {       Ar << WorldOrigin;  
       bHasWorldOrigin = true;  
    }    else  
    {  
       bHasWorldOrigin = false;  
    }  
    if (Ar.IsLoading())  
    {       AddInstigator(Instigator.Get(), EffectCauser.Get()); // Just to initialize InstigatorAbilitySystemComponent  
    }    
      
bOutSuccess = true;  
    return true;  
}
```