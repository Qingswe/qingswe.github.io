---
title: 7.2 法线贴图 [URP]
published: 2024-07-03
description: '当我们需要去计算光照的时候，我们需要统一各个方向矢量所在的坐标空间。对此有两种常用的方法：'
tags: [Shader, Unity, 图形学, URP]
category: Shader入门精要
draft: false
---

当我们需要去计算光照的时候，我们需要统一各个方向矢量所在的坐标空间。对此有两种常用的方法：

1. 在**切线空间**下进行光照计算，我们将光照的数据（光照方向、视角方向）变换到切线空间下
2. 在**世界空间**下进行光照计算，我们需要去采样法线纹理，然后将法线方向转换到世界空间下，然后与世界空间下的光照数据进行运算。
第二种方法因为需要对法线纹理进行采样，需要纹理坐标 uv 的数据，所以只能在片元着色器中实现。所以我们需要在片元着色器中进行一次，切线空间下的法线使用矩阵转换的操作。

---

### 切线空间下计算光照的实现

**基本思路：** 在顶点着色器中构建从世界空间到切线空间的 TBN 矩阵，将光照方向和视角方向变换到切线空间。片元着色器采样法线贴图后直接与切线空间的光照数据进行计算。

```glsl
Shader "Custom/NormalMap_TangentSpace"
{
    Properties
    {
        _MainTex  ("Albedo", 2D)           = "white" {}
        _BumpMap  ("Normal Map", 2D)       = "bump"  {}
        _BumpScale("Bump Scale", Float)    = 1.0
        _Specular ("Specular Color", Color) = (1,1,1,1)
        _Gloss    ("Gloss", Range(8,256))  = 20
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex   vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS
            #pragma multi_compile _ _SHADOWS_SOFT

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            TEXTURE2D(_MainTex);  SAMPLER(sampler_MainTex);
            TEXTURE2D(_BumpMap);  SAMPLER(sampler_BumpMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float4 _BumpMap_ST;
                float  _BumpScale;
                half4  _Specular;
                float  _Gloss;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float4 tangentOS  : TANGENT;
                float2 uv         : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float4 uv         : TEXCOORD0; // xy=MainTex, zw=BumpMap
                // 将光照/视角方向变换到切线空间，省去片元中的矩阵乘法
                float3 lightDirTS : TEXCOORD1;
                float3 viewDirTS  : TEXCOORD2;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv.xy = TRANSFORM_TEX(IN.uv, _MainTex);
                OUT.uv.zw = TRANSFORM_TEX(IN.uv, _BumpMap);

                // 构建切线空间基向量（世界空间）
                float3 worldNormal  = TransformObjectToWorldNormal(IN.normalOS);
                float3 worldTangent = TransformObjectToWorldDir(IN.tangentOS.xyz);
                // tangentOS.w 决定副切线朝向（+1 / -1）
                float3 worldBinormal = cross(worldNormal, worldTangent) * IN.tangentOS.w
                                     * GetOddNegativeScale(); // 处理镜像缩放

                // 构建世界→切线空间矩阵（行向量形式）
                float3x3 worldToTangent = float3x3(worldTangent, worldBinormal, worldNormal);

                // 在世界空间获取光照/视角方向，再变换到切线空间
                float3 worldPos = TransformObjectToWorld(IN.positionOS.xyz);
                Light mainLight = GetMainLight();
                OUT.lightDirTS = mul(worldToTangent, mainLight.direction);
                OUT.viewDirTS  = mul(worldToTangent, GetWorldSpaceViewDir(worldPos));

                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                // 解码切线空间法线
                half4 packedNormal = SAMPLE_TEXTURE2D(_BumpMap, sampler_BumpMap, IN.uv.zw);
                half3 tangentNormal = UnpackNormalScale(packedNormal, _BumpScale);

                float3 lightDir = normalize(IN.lightDirTS);
                float3 viewDir  = normalize(IN.viewDirTS);

                half3 albedo = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv.xy).rgb;

                // Blinn-Phong
                half3 ambient  = SampleSH(tangentNormal) * albedo; // 简化处理
                half  NdotL    = saturate(dot(tangentNormal, lightDir));
                half3 diffuse  = albedo * NdotL;

                float3 halfDir = normalize(lightDir + viewDir);
                half3 specular = _Specular.rgb * pow(saturate(dot(tangentNormal, halfDir)), _Gloss);

                Light mainLight = GetMainLight();
                return half4((ambient + (diffuse + specular) * mainLight.color), 1.0);
            }
            ENDHLSL
        }
    }
}
```

---

### 在世界空间下计算（建议）

**基本思路：** 在顶点着色器中计算从切线空间到世界空间的矩阵，然后传给片元着色器。片元着色器会拿到基于每个顶点结果插值后的矩阵。

然后在片元着色器中把法线纹理中的法线方向从切线空间变换到世界空间下即可。这种方式**通用性更强**，世界空间法线可以直接用于环境反射、SH 球谐等效果。

```glsl
Shader "Custom/NormalMap_WorldSpace"
{
    Properties
    {
        _MainTex  ("Albedo", 2D)           = "white" {}
        _BumpMap  ("Normal Map", 2D)       = "bump"  {}
        _BumpScale("Bump Scale", Float)    = 1.0
        _Specular ("Specular Color", Color) = (1,1,1,1)
        _Gloss    ("Gloss", Range(8,256))  = 20
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex   vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS
            #pragma multi_compile _ _SHADOWS_SOFT

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            TEXTURE2D(_MainTex);  SAMPLER(sampler_MainTex);
            TEXTURE2D(_BumpMap);  SAMPLER(sampler_BumpMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float4 _BumpMap_ST;
                float  _BumpScale;
                half4  _Specular;
                float  _Gloss;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float4 tangentOS  : TANGENT;
                float2 uv         : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float4 uv         : TEXCOORD0;
                float3 worldPos   : TEXCOORD1;
                // 切线→世界空间矩阵，分三行存储
                float3 T          : TEXCOORD2;
                float3 B          : TEXCOORD3;
                float3 N          : TEXCOORD4;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv.xy = TRANSFORM_TEX(IN.uv, _MainTex);
                OUT.uv.zw = TRANSFORM_TEX(IN.uv, _BumpMap);
                OUT.worldPos = TransformObjectToWorld(IN.positionOS.xyz);

                // 构建切线→世界空间矩阵（列向量形式，即 TBN 矩阵）
                OUT.N = TransformObjectToWorldNormal(IN.normalOS);
                OUT.T = TransformObjectToWorldDir(IN.tangentOS.xyz);
                OUT.B = cross(OUT.N, OUT.T) * IN.tangentOS.w * GetOddNegativeScale();

                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                // 采样法线贴图，解码为切线空间法线
                half4 packedNormal = SAMPLE_TEXTURE2D(_BumpMap, sampler_BumpMap, IN.uv.zw);
                half3 tangentNormal = UnpackNormalScale(packedNormal, _BumpScale);

                // 将法线从切线空间变换到世界空间
                // mul(TBN, n) 等价于 n.x*T + n.y*B + n.z*N
                float3x3 TBN = float3x3(IN.T, IN.B, IN.N); // 注意：行为 T/B/N
                float3 worldNormal = normalize(mul(tangentNormal, TBN));
                // 等价写法：normalize(tangentNormal.x * IN.T + tangentNormal.y * IN.B + tangentNormal.z * IN.N)

                // 世界空间光照计算
                Light mainLight = GetMainLight();
                float3 lightDir = normalize(mainLight.direction);
                float3 viewDir  = normalize(GetWorldSpaceViewDir(IN.worldPos));

                half3 albedo = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv.xy).rgb;

                half3 ambient  = SampleSH(worldNormal) * albedo;
                half  NdotL    = saturate(dot(worldNormal, lightDir));
                half3 diffuse  = albedo * NdotL;

                float3 halfDir = normalize(lightDir + viewDir);
                half3 specular = _Specular.rgb * pow(saturate(dot(worldNormal, halfDir)), _Gloss);

                return half4(ambient + (diffuse + specular) * mainLight.color, 1.0);
            }
            ENDHLSL
        }
    }
}
```

---

### 法线贴图的存储格式

法线贴图需要设置贴图的存储格式，这样 Unity 就会对该贴图使用压缩（**DXT5nm**）：

- **a 通道** 对应 x 分量
- **w 通道** 对应 y 分量
- **z 分量** 可以通过 xy 两个分量求出（因为法线是单位向量，z = sqrt(1 - x² - y²)）
所以法线贴图中只存储了必须的通道，通过舍弃 z 通道使其得以压缩。这就是为什么我们要使用 `UnpackNormal()` / `UnpackNormalScale()` 来解码法线，而不是直接读取 rgb 通道。

> 💡 在 Inspector 中将贴图类型设置为 **Normal Map** 后，Unity 会自动启用相应的压缩格式。URP 中推荐使用 `UnpackNormalScale(packedNormal, _BumpScale)` 代替旧版的 `UnpackNormal()`，它同时支持缩放控制。

---

### 从高度图（Height Map）生成法线

当我们需要导入**高度图**的时候，除了把纹理类型设置为 `Normal Map` 之外，还需要勾选 **Create From Grayscale**，就可以产生和切线空间下的法线纹理同等的效果了。

勾选 Create from Grayscale 之后，还会多出两个选项：

- **Bumpiness** — 用于控制凹凸程度，数值越大法线偏转越剧烈
- **Filtering** — 决定我们计算凹凸程度的方式：
<details>
<summary>Smooth</summary>

使用 Sobel 滤波器计算高度图的梯度，结果较为平滑，适合大多数场景。

</details>

<details>
<summary>Sharp</summary>

使用 Scharr 滤波器，对边缘更加敏感，产生更锐利的凹凸效果，适合砖块、石头等硬表面材质。

</details>

---

### 两种方案的对比

|  | 切线空间方案 | 世界空间方案 |
| --- | --- | --- |
| 法线变换时机 | 顶点着色器（变换光照/视角方向） | 片元着色器（变换法线方向） |
| 插值数据量 | 较少（两个 float3） | 较多（三个 float3 构成 TBN） |
| 性能 | 较好 | 略差 |
| 与其他效果结合 | 一般 | 更好（世界空间法线可直接用于 SH、反射等） |
| 适用场景 | 移动端、对性能敏感的场景 | PC 端、需要 IBL / 环境反射等高级效果 |

> 💡 URP 与 Built-in RP 的主要差异：使用 `HLSLPROGRAM` 而非 `CGPROGRAM`；引入 URP ShaderLibrary；光照方向通过 `GetMainLight().direction` 获取；法线变换使用 `TransformObjectToWorldNormal` 等封装函数；贴图采样改用 `TEXTURE2D` / `SAMPLE_TEXTURE2D` 宏。