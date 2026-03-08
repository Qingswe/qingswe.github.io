---
title: 11 让画面动起来 [URP]
published: 2024-07-12
description: '最常见的一种纹理动画'
tags: [Shader, Unity, 图形学, URP]
category: Shader入门精要
draft: false
---

## 11.1 UnityShader 内置变量

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| _Time | float4 | 场景自加载开始经过的时间，四个分量的值分别是(t/20,t,2t,3t) |
| _SinTime | float4 | t 是时间的正弦值，四个分量的值分别是(t/8,t/4,t/2,t) |
| _CosTime | float4 | t 是时间的余弦值，四个分量的值分别是(t/8,t/4,t/2,t) |
| unity_DeltaTime | float4 | dt 是时间增量，四个分量的值分别是(dt,1/dt,smoothDt,1/smoothDt) |

## 11.2纹理动画

### 11.2.1 序列帧动画

最常见的一种纹理动画

优点：

就是灵活性很强，变换不需要额外的运算就可以得到细腻的动画效果。

缺点：

序列帧中的每一帧图像都不一样，美术资源的 体量也就更大

<details>
<summary>Code</summary>

```csharp
Shader "Unity Shaders Book/Chapter11/ImageSequenceAnimation"
{
    Properties
    {
        _BaseColor("Base Color",Color) = (1,1,1,1)
        _BaseMap("Image Sequence", 2D) = "white" {}
        // 水平方向和垂直方向的图片个数
        _HorizontalAmount("Horizontal Amount", Float) =4
        _VerticalAmount("Vertical Amount", Float) =4
        _Speed("Speed", Range(1,100)) = 30
    }

    SubShader
    {
        Tags
        {
            "Queue" = "Transparent" "IgnoreProjector"="True" "RenderType"="Transparent"
        }
        Pass
        {
            ZWrite Off
            Blend SrcAlpha OneMinusSrcAlpha

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/UnityInput.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Input.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"
            #include  "Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareOpaqueTexture.hlsl"

            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float4 _BaseColor;
                float _HorizontalAmount;
                float _VerticalAmount;
                float _Speed;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS:POSITION;
                float2 texcoord:TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS:SV_POSITION;
                float2 uv:TEXCOORD0;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;

                OUT.positionCS = TransformObjectToHClip(IN.positionOS);
                OUT.uv = TRANSFORM_TEX(IN.texcoord, _BaseMap);

                return OUT;
            }

            half4 frag(Varyings IN):SV_TARGET
            {
                float time = floor(_Time.y * _Speed);
                float row = floor(time / _HorizontalAmount);
                float column = time - row * _HorizontalAmount;

                half2 uv  = float2(IN.uv.x/_HorizontalAmount , IN.uv.y/_VerticalAmount );
                uv.x+=column/_HorizontalAmount;
                uv.y-=row/_VerticalAmount;

                // half2 uv = IN.uv + half2(column, row);
                // uv.x /= _HorizontalAmount;
                // uv.y /= _VerticalAmount;

                half4 c = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv);
                c.rgb *= _BaseColor.rgb;
                return c;
            }
            ENDHLSL
        }
    }
    Fallback "Mobile/VertexLit"

}
```

</details>

### 11.2.2 滚动的背景

输入两个纹理，使用第二张纹理的Alpha值去 lerp混合 两个纹理。并且使用_Time 的y值去分别设置两个纹理滚动的速度，创造出移动的效果。

最后使用_Multiplier参数和输出颜色相乘，调整背景亮度（两层纹理）

<details>
<summary>Code</summary>

```csharp
Shader "Unity Shaders Book/Chapter11/ScrollingBackground"
{
    Properties
    {
        _BaseMap("Base Layer (RGB)", 2D) = "white" {}
        _DetailMap("2nd Layer (RGB)", 2D) = "white" {}
        _ScrollX("Base Layer Scroll Speed",Float) = 1.0
        _Scroll2X("2nd Layer Scroll Speed",Float) = 1.0
        _Multiplier("Layer Multiplier",Float) = 1
    }

    SubShader
    {
        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/UnityInput.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Input.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"
            #include  "Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareOpaqueTexture.hlsl"

            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);

            TEXTURE2D(_DetailMap);
            SAMPLER(sampler_DetailMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float4 _DetailMap_ST;
                float _ScrollX;
                float _Scroll2X;
                float _Multiplier;

            CBUFFER_END

            struct Attributes
            {
                float4 positionOS: POSITION;
                float2 texcoord: TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS:SV_POSITION;
                float4 uv :TEXCOORD0;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionCS = TransformObjectToHClip(IN.positionOS);
                OUT.uv.xy = TRANSFORM_TEX(IN.texcoord, _BaseMap)+frac(float2(_ScrollX,0)*_Time.y);
                OUT.uv.zw = TRANSFORM_TEX(IN.texcoord, _DetailMap)+frac(float2(_Scroll2X,0)*_Time.y);
                
                return OUT;
            }

            half4 frag(Varyings IN):SV_TARGET
            {
                half4 firstLayer = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv.xy);
                half4 secondLayer = SAMPLE_TEXTURE2D(_DetailMap, sampler_DetailMap, IN.uv.zw);
                half4 c = lerp(firstLayer,secondLayer,secondLayer.a);
                c.rgb*= _Multiplier;
                return c;
            }
            ENDHLSL
        }
    }

}
```

</details>

## 11.3 顶点动画

### 11.3.2 广告牌

还有一种常见的顶点动画 广告牌技术(Billboarding) 

该技术会根据视角的方向来旋转一个多边形，使这个多边形（通常是面片）看起来始终朝向摄像机。

该技术的本质就是 构建旋转矩阵，我们需要的基向量由 表面法线、指向上的方向和指向右的方向组成。除此之外我们还需要一个锚点确定多边形在空间中的位置。

难点在于我们需要去确认这三个 构成矩阵的基向量。

首先我们会根据视角方向去确认表面法线。然后再拿取向上的方向，然后使用叉乘 获得垂直于这两个方向的 向量。

我们由两种标准的 模拟方法 一种是 模拟草丛，一种是模拟粒子

表面法线 和 向上的方向 它们之间通常是不垂直的，但是有一个方向会是固定的，例如

模拟草丛 需要保持草丛视觉的透视关系，所以向上的方向是固定的

模拟粒子 始终需要朝向摄像机，所以表面法线方向是固定的

假设法线方向是固定的，我们先叉乘法线方向和向上方向，获得右方向

$$
right=up×normal
$$

对其归一化之后，再由 右方向和法线方向 获取这个变化后的 上方向

$$
up'=normal×right
$$

至此获得 旋转矩阵的 三个正交基

<details>
<summary>知识补充 叉乘方向</summary>

$$
[x_1,y_1,z_1]×[x_2,y_2,z_2]=[y_1z_2-z_1y_2,z_1x_2-x_1z_2,x_1y_2-y_1x_2]
$$

||a×b|| = ||a|| ||b|| sinθ

叉乘的大小A就是 b * h h是平行四边形的高 也就是 a sinθ

A    = bh

如果 a和b是平行的，或者a或b是零矢量，a×b=0

将b的尾部放到a的头部 可以确定 a×b 的方向，检查 a 和 b 是否是顺时针转动。

左手坐标系：a×b 顺时针指向你 逆时针远离你

右手坐标系：a×b 顺时针远离你，逆时针指向你

基本轴向叉积

|  |  |
| --- | --- |
|  |  |
|  |  |

</details>

### 11.3.3 注意事项

如果我们在模型空间下进行定点动画，那么由于批处理会合并模型，往往就会破坏这种动画效果，但是取消批处理会造成性能下降。所以我们应该避免面显示使用模型空间的中心作为锚点，我们可以使用顶点颜色来存储每个顶点到锚点的距离值。这在商业游戏中很常见。

如果我们想要对包含了顶点动画的物体添加阴影的话，使用内置的如Lit等包含阴影Pass渲染，是得不到正确的效果的，这是因为 如果直接使用这些内置的 ShadowCaster Pass，这个Pass中并没有进行相关的顶点动画，因此Unity会按照原来的顶点位置来计算阴影。

需要注意的是我们之前的Fallback 使用的shader 文件 是没有实现 ShadowCasterPass 的，也就不会产生阴影

我们需要自定义 ShadowCaster Pass 去实现变形对象阴影的显示

<details>
<summary>Vertex变化 阴影代码</summary>

```csharp

        Pass
        {
            Tags
            {
                "LightMode" = "ShadowCaster"
            }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compilie_shadowcaster
            #pragma multi_compile_vertex _ _CASTING_PUNCTUAL_LIGHT_SHADOW

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/UnityInput.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Input.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"
            #include  "Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareOpaqueTexture.hlsl"

            CBUFFER_START(UnityPerMaterial)
                float _Magnitude;
                float _Frequency;
                float _InvWaveLength;
                float _Speed;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float4 normalOS:NORMAL;
                float4 texcoord:TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float4 uv:TEXCOORD0;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;

                float3 positionWS = TransformObjectToWorld(IN.positionOS).xyz;
                float3 normalWS = TransformObjectToWorld(IN.normalOS).xyz;
                float4 offset;
                offset.yzw = float3(0, 0, 0);
                // 只需要x轴的偏移
                offset.x = sin(
                    _Frequency * _Time.y + IN.positionOS.x * _InvWaveLength + IN.positionOS.y * _InvWaveLength + IN.
                    positionOS.z * _InvWaveLength) * _Magnitude;
                IN.positionOS += offset;

                OUT.positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS,
                                                                       normalWS,
                                                                       _MainLightPosition));
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                return 0;
            }
            ENDHLSL
        }
```

</details>

#### Add relevant files