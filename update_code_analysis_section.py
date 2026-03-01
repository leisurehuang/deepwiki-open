#!/usr/bin/env python3
"""Script to update all README files with code analysis section"""

import os
import re

# Define the new section content for each language
NEW_SECTIONS = {
    "README.zh.md": """## 🧠 代码分析与 SOLID 原则评估

DeepWiki 包含全面的代码分析功能，可自动评估 SOLID 原则：

### 分析维度

DeepWiki 从 **7 个关键维度** 分析代码：

1. **架构设计** - 设计模式、架构模式、关注点分离
2. **SOLID 原则** - 自动评分评估（每项 0-4 分，总分 0-20）
3. **质量内建** - 代码可读性、测试覆盖率、错误处理、安全性
4. **代码味道与重构** - 识别反模式并提供改进建议
5. **设计模式应用** - 评估模式使用并建议替代方案
6. **依赖管理** - 分析耦合度、循环依赖
7. **抽象层次** - 评估接口、封装、抽象层次

### SOLID 原则评分

每个 SOLID 原则按 **0-4 分** 评估：

- **4 分**：优秀实现，完全遵循原则
- **3 分**：良好实现，有轻微问题
- **2 分**：中等实现，存在一些违规
- **1 分**：差实现，存在重大违规
- **0 分**：未遵循该原则

**SOLID 总分**：所有 5 个原则的总和（0-20 分）

### 分析流程

```mermaid
graph TD
    A[用户查询] --> B{查询类型?}
    B -->|代码分析| C{研究深度?}
    B -->|简单问题| D[SIMPLE_CHAT_SYSTEM_PROMPT]
    C -->|深度研究| E[DEEP_RESEARCH 迭代]
    C -->|快速分析| D
    
    E --> E1[迭代 1: 研究计划]
    E1 --> E2{更多迭代?}
    E2 -->|是| E3[中间迭代]
    E3 --> E4[迭代 2-3: 深入研究]
    E4 --> E5{最终迭代?}
    E5 -->|否| E3
    E5 -->|是| E6[最终迭代]
    E2 -->|否| E6
    
    D --> F[应用分析框架]
    E6 --> F
    
    F --> F1[维度 1: 架构设计]
    F --> F2[维度 2: SOLID 原则]
    F --> F3[维度 3: 质量内建]
    F --> F4[维度 4: 代码味道]
    F --> F5[维度 5: 设计模式]
    F --> F6[维度 6: 依赖管理]
    F --> F7[维度 7: 抽象层次]
    
    F1 --> G[生成结构化报告]
    F2 --> H[SOLID 原则分析]
    F3 --> G
    F4 --> G
    F5 --> G
    F6 --> G
    F7 --> G
    
    H --> H1[SRP 评分 + 分析]
    H --> H2[OCP 评分 + 分析]
    H --> H3[LSP 评分 + 分析]
    H --> H4[ISP 评分 + 分析]
    H --> H5[DIP 评分 + 分析]
    
    H1 --> I[SOLID 总分]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[最终报告]
    G --> J
    
    J --> K[输出格式]
    K --> K1[## 维度名称]
    K --> K2[✅ 优势]
    K --> K3[⚠️ 改进建议]
    K --> K4[**分析** 包含代码示例]
    K --> K5[**评分**: X/4]
    K --> K6[**总分**: X/20]
    
    classDef input stroke-width:2px;
    classDef decision stroke-width:2px,stroke-dasharray: 5 5;
    classDef process stroke-width:2px;
    classDef analysis stroke-width:2px,fill:#e1f5ff;
    classDef solid stroke-width:2px,fill:#fff3e0;
    classDef output stroke-width:2px,fill:#e8f5e9;
    
    class A input;
    class B,C,E2,E5 decision;
    class D,E,E1,E3,E4,E6,F process;
    class F1,F2,F3,F4,F5,F6,F7 analysis;
    class H,H1,H2,H3,H4,H5 solid;
    class G,I,J,K,K1,K2,K3,K4,K5,K6 output;
```

### SOLID 分析输出示例

当分析代码时，DeepWiki 提供结构化反馈，如下所示：

```markdown
## SOLID 原则

### 单一职责原则 (SRP)
**评分**: 3/4
✅ **优势**: UserService 类职责清晰且聚焦
⚠️ **改进建议**: UserController 混合了日志记录与业务逻辑
**分析**: UserService 类设计良好，具有单一职责。但 UserController 违反了 SRP，因为它同时处理 HTTP 请求和日志记录关注点。

### 开闭原则 (OCP)
**评分**: 2/4
✅ **优势**: PaymentProcessor 接口允许扩展
⚠️ **改进建议**: 添加新支付类型需要修改现有的 switch 语句
**分析**: 虽然接口支持扩展，但实现使用的条件逻辑违反了 OCP。建议使用策略模式。

[... 继续分析 LSP、ISP、DIP ...]

**SOLID 总分**: 14/20
```

""",
    "README.zh-tw.md": """## 🧠 程式碼分析與 SOLID 原則評估

DeepWiki 包含全面的程式碼分析功能，可自動評估 SOLID 原則：

### 分析維度

DeepWiki 從 **7 個關鍵維度** 分析程式碼：

1. **架構設計** - 設計模式、架構模式、關注點分離
2. **SOLID 原則** - 自動評分評估（每項 0-4 分，總分 0-20）
3. **品質內建** - 程式碼可讀性、測試覆蓋率、錯誤處理、安全性
4. **程式碼異味與重構** - 識別反模式並提供改進建議
5. **設計模式應用** - 評估模式使用並建議替代方案
6. **相依性管理** - 分析耦合度、循環相依
7. **抽象層次** - 評估介面、封裝、抽象層次

### SOLID 原則評分

每個 SOLID 原則按 **0-4 分** 評估：

- **4 分**：優秀實作，完全遵循原則
- **3 分**：良好實作，有輕微問題
- **2 分**：中等實作，存在一些違規
- **1 分**：差實作，存在重大違規
- **0 分**：未遵循該原則

**SOLID 總分**：所有 5 個原則的總和（0-20 分）

### 分析流程

```mermaid
graph TD
    A[使用者查詢] --> B{查詢類型?}
    B -->|程式碼分析| C{研究深度?}
    B -->|簡單問題| D[SIMPLE_CHAT_SYSTEM_PROMPT]
    C -->|深度研究| E[DEEP_RESEARCH 迭代]
    C -->|快速分析| D
    
    E --> E1[迭代 1: 研究計畫]
    E1 --> E2{更多迭代?}
    E2 -->|是| E3[中間迭代]
    E3 --> E4[迭代 2-3: 深入研究]
    E4 --> E5{最終迭代?}
    E5 -->|否| E3
    E5 -->|是| E6[最終迭代]
    E2 -->|否| E6
    
    D --> F[應用分析框架]
    E6 --> F
    
    F --> F1[維度 1: 架構設計]
    F --> F2[維度 2: SOLID 原則]
    F --> F3[維度 3: 品質內建]
    F --> F4[維度 4: 程式碼異味]
    F --> F5[維度 5: 設計模式]
    F --> F6[維度 6: 相依性管理]
    F --> F7[維度 7: 抽象層次]
    
    F1 --> G[生成結構化報告]
    F2 --> H[SOLID 原則分析]
    F3 --> G
    F4 --> G
    F5 --> G
    F6 --> G
    F7 --> G
    
    H --> H1[SRP 評分 + 分析]
    H --> H2[OCP 評分 + 分析]
    H --> H3[LSP 評分 + 分析]
    H --> H4[ISP 評分 + 分析]
    H --> H5[DIP 評分 + 分析]
    
    H1 --> I[SOLID 總分]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[最終報告]
    G --> J
    
    J --> K[輸出格式]
    K --> K1[## 維度名稱]
    K --> K2[✅ 優勢]
    K --> K3[⚠️ 改進建議]
    K --> K4[**分析** 包含程式碼範例]
    K --> K5[**評分**: X/4]
    K --> K6[**總分**: X/20]
    
    classDef input stroke-width:2px;
    classDef decision stroke-width:2px,stroke-dasharray: 5 5;
    classDef process stroke-width:2px;
    classDef analysis stroke-width:2px,fill:#e1f5ff;
    classDef solid stroke-width:2px,fill:#fff3e0;
    classDef output stroke-width:2px,fill:#e8f5e9;
    
    class A input;
    class B,C,E2,E5 decision;
    class D,E,E1,E3,E4,E6,F process;
    class F1,F2,F3,F4,F5,F6,F7 analysis;
    class H,H1,H2,H3,H4,H5 solid;
    class G,I,J,K,K1,K2,K3,K4,K5,K6 output;
```

### SOLID 分析輸出範例

當分析程式碼時，DeepWiki 提供結構化回饋，如下所示：

```markdown
## SOLID 原則

### 單一職責原則 (SRP)
**評分**: 3/4
✅ **優勢**: UserService 類別職責清晰且聚焦
⚠️ **改進建議**: UserController 混合了日誌記錄與業務邏輯
**分析**: UserService 類別設計良好，具有單一職責。但 UserController 違反了 SRP，因為它同時處理 HTTP 請求和日誌記錄關注點。

### 開閉原則 (OCP)
**評分**: 2/4
✅ **優勢**: PaymentProcessor 介面允許擴展
⚠️ **改進建議**: 新增新支付類型需要修改現有的 switch 語句
**分析**: 雖然介面支援擴展，但實作使用的條件邏輯違反了 OCP。建議使用策略模式。

[... 繼續分析 LSP、ISP、DIP ...]

**SOLID 總分**: 14/20
```

""",
    "README.ja.md": """## 🧠 コード分析とSOLID原則の評価

DeepWikiには、包括的なコード分析機能とSOLID原則の自動評価が含まれています：

### 分析の次元

DeepWikiは**7つの重要な次元**でコードを分析します：

1. **アーキテクチャ設計** - デザインパターン、アーキテクチャパターン、関心の分離
2. **SOLID原則** - 自動スコアリング評価（各項目0-4点、総合0-20点）
3. **品質の内蔵** - コードの可読性、テストカバレッジ、エラー処理、セキュリティ
4. **コードの臭いとリファクタリング** - アンチパターンの特定と改善提案
5. **デザインパターンの適用** - パターン使用の評価と代替案の提案
6. **依存関係の管理** - 結合度、循環依存の分析
7. **抽象化レベル** - インターフェース、カプセル化、抽象化階層の評価

### SOLID原則のスコアリング

各SOLID原則は**0-4点**で評価されます：

- **4点**：優秀な実装、原則を完全に従っている
- **3点**：良好な実装、軽微な問題あり
- **2点**：中程度の実装、いくつかの違反あり
- **1点**：劣悪な実装、重大な違反あり
- **0点**：原則に従っていない

**SOLID総合スコア**：すべて5つの原則の合計（0-20点）

### 分析フロー

```mermaid
graph TD
    A[ユーザークエリ] --> B{クエリタイプ?}
    B -->|コード分析| C{研究深度?}
    B -->|シンプルな質問| D[SIMPLE_CHAT_SYSTEM_PROMPT]
    C -->|ディープリサーチ| E[DEEP_RESEARCH 反復]
    C -->|クイック分析| D
    
    E --> E1[反復 1: 研究計画]
    E1 --> E2{さらなる反復?}
    E2 -->|はい| E3[中間反復]
    E3 --> E4[反復 2-3: 深掘り]
    E4 --> E5{最終反復?}
    E5 -->|いいえ| E3
    E5 -->|はい| E6[最終反復]
    E2 -->|いいえ| E6
    
    D --> F[分析フレームワークを適用]
    E6 --> F
    
    F --> F1[次元 1: アーキテクチャ設計]
    F --> F2[次元 2: SOLID原則]
    F --> F3[次元 3: 品質の内蔵]
    F --> F4[次元 4: コードの臭い]
    F --> F5[次元 5: デザインパターン]
    F --> F6[次元 6: 依存関係]
    F --> F7[次元 7: 抽象化]
    
    F1 --> G[構造化レポートを生成]
    F2 --> H[SOLID原則分析]
    F3 --> G
    F4 --> G
    F5 --> G
    F6 --> G
    F7 --> G
    
    H --> H1[SRP スコア + 分析]
    H --> H2[OCP スコア + 分析]
    H --> H3[LSP スコア + 分析]
    H --> H4[ISP スコア + 分析]
    H --> H5[DIP スコア + 分析]
    
    H1 --> I[SOLID総合スコア]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[最終レポート]
    G --> J
    
    J --> K[出力フォーマット]
    K --> K1[## 次元名]
    K --> K2[✅ 強み]
    K --> K3[⚠️ 改善領域]
    K --> K4[**分析** コード例付き]
    K --> K5[**スコア**: X/4]
    K --> K6[**総合スコア**: X/20]
    
    classDef input stroke-width:2px;
    classDef decision stroke-width:2px,stroke-dasharray: 5 5;
    classDef process stroke-width:2px;
    classDef analysis stroke-width:2px,fill:#e1f5ff;
    classDef solid stroke-width:2px,fill:#fff3e0;
    classDef output stroke-width:2px,fill:#e8f5e9;
    
    class A input;
    class B,C,E2,E5 decision;
    class D,E,E1,E3,E4,E6,F process;
    class F1,F2,F3,F4,F5,F6,F7 analysis;
    class H,H1,H2,H3,H4,H5 solid;
    class G,I,J,K,K1,K2,K3,K4,K5,K6 output;
```

### SOLID分析出力例

コードを分析する際、DeepWikiは以下のような構造化されたフィードバックを提供します：

```markdown
## SOLID原則

### 単一責任の原則 (SRP)
**スコア**: 3/4
✅ **強み**: UserServiceクラスは明確で集中した責任を持っています
⚠️ **改善領域**: UserControllerはログ記録とビジネスロジックを混在させています
**分析**: UserServiceクラスは設計が良く、単一の責任を持っています。しかし、UserControllerはHTTPリクエストとログ記録の両方を処理するため、SRPに違反しています。

### 開放閉鎖の原則 (OCP)
**スコア**: 2/4
✅ **強み**: PaymentProcessorインターフェースは拡張を可能にします
⚠️ **改善領域**: 新しい支払いタイプを追加するには、既存のswitchステートメントを変更する必要があります
**分析**: インターフェースは拡張をサポートしていますが、実装は条件論理を使用しており、OCPに違反しています。ストラテジーパターンの使用を検討してください。

[... LSP、ISP、DIPの分析を継続 ...]

**SOLID総合スコア**: 14/20
```

""",
    "README.es.md": """## 🧠 Análisis de Código y Evaluación de Principios SOLID

DeepWiki incluye capacidades integrales de análisis de código con evaluación automática de principios SOLID:

### Dimensiones de Análisis

DeepWiki analiza el código en **7 dimensiones clave**:

1. **Diseño de Arquitectura** - Patrones de diseño, patrones arquitectónicos, separación de preocupaciones
2. **Principios SOLID** - Evaluación automatizada con puntuación (0-4 por principio, 0-20 total)
3. **Calidad Integrada** - Legibilidad del código, cobertura de pruebas, manejo de errores, seguridad
4. **Olores de Código y Refactorización** - Identificar anti-patrones y sugerir mejoras
5. **Aplicación de Patrones de Diseño** - Evaluar el uso de patrones y sugerir alternativas
6. **Gestión de Dependencias** - Analizar acoplamiento, dependencias circulares
7. **Niveles de Abstracción** - Evaluar interfaces, encapsulamiento, jerarquías de abstracción

### Puntuación de Principios SOLID

Cada principio SOLID se evalúa en una **escala de 0-4**:

- **4 puntos**: Implementación excelente, sigue el principio perfectamente
- **3 puntos**: Buena implementación, problemas menores
- **2 puntos**: Implementación moderada, algunas violaciones
- **1 punto**: Implementación pobre, violaciones significativas
- **0 puntos**: No se adhiere al principio

**Puntuación Total SOLID**: Suma de todos los 5 principios (0-20)

### Flujo de Análisis

```mermaid
graph TD
    A[Consulta del Usuario] --> B{¿Tipo de Consulta?}
    B -->|Análisis de Código| C{¿Profundidad de Investigación?}
    B -->|Pregunta Simple| D[SIMPLE_CHAT_SYSTEM_PROMPT]
    C -->|Investigación Profunda| E[Iteraciones DEEP_RESEARCH]
    C -->|Análisis Rápido| D
    
    E --> E1[Iteración 1: Plan de Investigación]
    E1 --> E2{¿Más Iteraciones?}
    E2 -->|Sí| E3[Iteraciones Intermedias]
    E3 --> E4[Iteración 2-3: Profundización]
    E4 --> E5{¿Última Iteración?}
    E5 -->|No| E3
    E5 -->|Sí| E6[Última Iteración]
    E2 -->|No| E6
    
    D --> F[Aplicar Marco de Análisis]
    E6 --> F
    
    F --> F1[Dimensión 1: Diseño de Arquitectura]
    F --> F2[Dimensión 2: Principios SOLID]
    F --> F3[Dimensión 3: Calidad Integrada]
    F --> F4[Dimensión 4: Olores de Código]
    F --> F5[Dimensión 5: Patrones de Diseño]
    F --> F6[Dimensión 6: Dependencias]
    F --> F7[Dimensión 7: Abstracción]
    
    F1 --> G[Generar Reporte Estructurado]
    F2 --> H[Análisis de Principios SOLID]
    F3 --> G
    F4 --> G
    F5 --> G
    F6 --> G
    F7 --> G
    
    H --> H1[Puntuación SRP + Análisis]
    H --> H2[Puntuación OCP + Análisis]
    H --> H3[Puntuación LSP + Análisis]
    H --> H4[Puntuación ISP + Análisis]
    H --> H5[Puntuación DIP + Análisis]
    
    H1 --> I[Puntuación Total SOLID]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[Reporte Final]
    G --> J
    
    J --> K[Formato de Salida]
    K --> K1[## Nombre de Dimensión]
    K --> K2[✅ Fortalezas]
    K --> K3[⚠️ Áreas de Mejora]
    K --> K4[**Análisis** con Ejemplos de Código]
    K --> K5[**Puntuación**: X/4]
    K --> K6[**Puntuación Total**: X/20]
    
    classDef input stroke-width:2px;
    classDef decision stroke-width:2px,stroke-dasharray: 5 5;
    classDef process stroke-width:2px;
    classDef analysis stroke-width:2px,fill:#e1f5ff;
    classDef solid stroke-width:2px,fill:#fff3e0;
    classDef output stroke-width:2px,fill:#e8f5e9;
    
    class A input;
    class B,C,E2,E5 decision;
    class D,E,E1,E3,E4,E6,F process;
    class F1,F2,F3,F4,F5,F6,F7 analysis;
    class H,H1,H2,H3,H4,H5 solid;
    class G,I,J,K,K1,K2,K3,K4,K5,K6 output;
```

### Ejemplo de Salida de Análisis SOLID

Al analizar código, DeepWiki proporciona retroalimentación estructurada como esta:

```markdown
## Principios SOLID

### Principio de Responsabilidad Única (SRP)
**Puntuación**: 3/4
✅ **Fortalezas**: La clase UserService tiene una responsabilidad clara y enfocada
⚠️ **Áreas de Mejora**: UserController mezcla el registro con la lógica de negocio
**Análisis**: La clase UserService está bien diseñada con una sola responsabilidad. Sin embargo, UserController viola SRP al manejar tanto solicitudes HTTP como preocupaciones de registro.

### Principio Abierto/Cerrado (OCP)
**Puntuación**: 2/4
✅ **Fortalezas**: La interfaz PaymentProcessor permite extensiones
⚠️ **Áreas de Mejora**: Agregar nuevos tipos de pago requiere modificar la sentencia switch existente
**Análisis**: Aunque la interfaz soporta extensiones, la implementación usa lógica condicional que viola OCP. Considere usar el patrón Strategy.

[... continúa para LSP, ISP, DIP ...]

**Puntuación Total SOLID**: 14/20
```

""",
    "README.kr.md": """## 🧠 코드 분석 및 SOLID 원칙 평가

DeepWiki는 자동 SOLID 원칙 평가 기능을 포함한 포괄적인 코드 분석 기능을 제공합니다:

### 분석 차원

DeepWiki는 **7가지 핵심 차원**에서 코드를 분석합니다:

1. **아키텍처 설계** - 디자인 패턴, 아키텍처 패턴, 관심사 분리
2. **SOLID 원칙** - 자동 평가 및 점수 매기기 (각 원칙당 0-4점, 총점 0-20)
3. **품질 내장** - 코드 가독성, 테스트 커버리지, 오류 처리, 보안
4. **코드 냄새 및 리팩토링** - 안티 패턴 식별 및 개선 제안
5. **디자인 패턴 적용** - 패턴 사용 평가 및 대안 제안
6. **의존성 관리** - 결합도, 순환 의존성 분석
7. **추상화 수준** - 인터페이스, 캡슐화, 추상화 계층 평가

### SOLID 원칙 점수 매기기

각 SOLID 원칙은 **0-4점 척도**로 평가됩니다:

- **4점**: 우수한 구현, 원칙을 완벽하게 준수
- **3점**: 양호한 구현, 사소한 문제 있음
- **2점**: 보통 구현, 일부 위반 있음
- **1점**: 부족한 구현, 중대한 위반 있음
- **0점**: 원칙을 준수하지 않음

**SOLID 총점**: 모든 5개 원칙의 합계 (0-20)

### 분석 흐름

```mermaid
graph TD
    A[사용자 쿼리] --> B{쿼리 유형?}
    B -->|코드 분석| C{연구 깊이?}
    B -->|단순 질문| D[SIMPLE_CHAT_SYSTEM_PROMPT]
    C -->|심층 연구| E[DEEP_RESEARCH 반복]
    C -->|빠른 분석| D
    
    E --> E1[반복 1: 연구 계획]
    E1 --> E2{추가 반복?}
    E2 -->|예| E3[중간 반복]
    E3 --> E4[반복 2-3: 심층 조사]
    E4 --> E5{마지막 반복?}
    E5 -->|아니오| E3
    E5 -->|예| E6[마지막 반복]
    E2 -->|아니오| E6
    
    D --> F[분석 프레임워크 적용]
    E6 --> F
    
    F --> F1[차원 1: 아키텍처 설계]
    F --> F2[차원 2: SOLID 원칙]
    F --> F3[차원 3: 품질 내장]
    F --> F4[차원 4: 코드 냄새]
    F --> F5[차원 5: 디자인 패턴]
    F --> F6[차원 6: 의존성]
    F --> F7[차원 7: 추상화]
    
    F1 --> G[구조화된 보고서 생성]
    F2 --> H[SOLID 원칙 분석]
    F3 --> G
    F4 --> G
    F5 --> G
    F6 --> G
    F7 --> G
    
    H --> H1[SRP 점수 + 분석]
    H --> H2[OCP 점수 + 분석]
    H --> H3[LSP 점수 + 분석]
    H --> H4[ISP 점수 + 분석]
    H --> H5[DIP 점수 + 분석]
    
    H1 --> I[SOLID 총점]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[최종 보고서]
    G --> J
    
    J --> K[출력 형식]
    K --> K1[## 차원 이름]
    K --> K2[✅ 강점]
    K --> K3[⚠️ 개선 영역]
    K --> K4[**분석** 코드 예제 포함]
    K --> K5[**점수**: X/4]
    K --> K6[**총점**: X/20]
    
    classDef input stroke-width:2px;
    classDef decision stroke-width:2px,stroke-dasharray: 5 5;
    classDef process stroke-width:2px;
    classDef analysis stroke-width:2px,fill:#e1f5ff;
    classDef solid stroke-width:2px,fill:#fff3e0;
    classDef output stroke-width:2px,fill:#e8f5e9;
    
    class A input;
    class B,C,E2,E5 decision;
    class D,E,E1,E3,E4,E6,F process;
    class F1,F2,F3,F4,F5,F6,F7 analysis;
    class H,H1,H2,H3,H4,H5 solid;
    class G,I,J,K,K1,K2,K3,K4,K5,K6 output;
```

### SOLID 분석 출력 예시

코드를 분석할 때 DeepWiki는 다음과 같은 구조화된 피드백을 제공합니다:

```markdown
## SOLID 원칙

### 단일 책임 원칙 (SRP)
**점수**: 3/4
✅ **강점**: UserService 클래스는 명확하고 집중된 책임을 가집니다
⚠️ **개선 영역**: UserController는 로깅과 비즈니스 로직을 혼합합니다
**분석**: UserService 클래스는 단일 책임으로 잘 설계되었습니다. 그러나 UserController는 HTTP 요청과 로깅 관심사를 모두 처리하므로 SRP를 위반합니다.

### 개방-폐쇄 원칙 (OCP)
**점수**: 2/4
✅ **강점**: PaymentProcessor 인터페이스는 확장을 허용합니다
⚠️ **개선 영역**: 새로운 결제 유형을 추가하려면 기존 switch 문을 수정해야 합니다
**분석**: 인터페이스는 확장을 지원하지만, 구현은 OCP를 위반하는 조건부 논리를 사용합니다. 전략 패턴 사용을 고려하십시오.

[... LSP, ISP, DIP 분석 계속 ...]

**SOLID 총점**: 14/20
```

""",
    "README.vi.md": """## 🧠 Phân Tích Mã và Đánh Giá Nguyên Tắc SOLID

DeepWiki bao gồm các khả năng phân tích mã toàn diện với đánh giá tự động các nguyên tắc SOLID:

### Các Chiều Phân Tích

DeepWiki phân tích mã trên **7 chiều chính**:

1. **Thiết Kế Kiến Trúc** - Mẫu thiết kế, mẫu kiến trúc, sự phân tách mối quan tâm
2. **Nguyên Tắc SOLID** - Đánh giá tự động với điểm số (0-4 mỗi nguyên tắc, 0-20 tổng)
3. **Chất Lượng Được Xây Dựng** - Khả năng đọc mã, độ phủ kiểm thử, xử lý lỗi, bảo mật
4. **Mùi Mã và Tái Cấu Trúc** - Xác định các anti-pattern và đề xuất cải tiến
5. **Ứng Dụng Mẫu Thiết Kế** - Đánh giá việc sử dụng mẫu và đề xuất thay thế
6. **Quản Lý Phụ Thuộc** - Phân tích sự kết hợp, phụ thuộc vòng tròn
7. **Các Mức Độ Trừu Tượng** - Đánh giá giao diện, đóng gói, phân cấp trừu tượng

### Điểm Số Nguyên Tắc SOLID

Mỗi nguyên tắc SOLID được đánh giá trên **thang điểm 0-4**:

- **4 điểm**: Thực hiện xuất sắc, tuân theo nguyên tắc hoàn hảo
- **3 điểm**: Thực hiện tốt, một số vấn đề nhỏ
- **2 điểm**: Thực hiện vừa phải, một số vi phạm
- **1 điểm**: Thực hiện kém, các vi phạm đáng kể
- **0 điểm**: Không tuân theo nguyên tắc

**Tổng Điểm SOLID**: Tổng của tất cả 5 nguyên tắc (0-20)

### Quy Trình Phân Tích

```mermaid
graph TD
    A[Truy vấn Người dùng] --> B{Loại Truy vấn?}
    B -->|Phân tích Mã| C{Độ Sâu Nghiên Cứu?}
    B -->|Câu Hỏi Đơn Giản| D[SIMPLE_CHAT_SYSTEM_PROMPT]
    C -->|Nghiên Cứu Sâu| E[Lặp DEEP_RESEARCH]
    C -->|Phân Tích Nhanh| D
    
    E --> E1[Lặp 1: Kế Hoạch Nghiên Cứu]
    E1 --> E2{Thêm Lặp?}
    E2 -->|Có| E3[Lặp Trung Gian]
    E3 --> E4[Lặp 2-3: Sâu Hơn]
    E4 --> E5{Lặp Cuối?}
    E5 -->|Không| E3
    E5 -->|Có| E6[Lặp Cuối]
    E2 -->|Không| E6
    
    D --> F[Áp Dụng Khung Phân Tích]
    E6 --> F
    
    F --> F1[Chiều 1: Thiết Kế Kiến Trúc]
    F --> F2[Chiều 2: Nguyên Tắc SOLID]
    F --> F3[Chiều 3: Chất Lượng]
    F --> F4[Chiều 4: Mùi Mã]
    F --> F5[Chiều 5: Mẫu Thiết Kế]
    F --> F6[Chiều 6: Phụ Thuộc]
    F --> F7[Chiều 7: Trừu Tượng]
    
    F1 --> G[Tạo Báo Cáo Cấu Trúc]
    F2 --> H[Phân Tích Nguyên Tắc SOLID]
    F3 --> G
    F4 --> G
    F5 --> G
    F6 --> G
    F7 --> G
    
    H --> H1[Điểm SRP + Phân Tích]
    H --> H2[Điểm OCP + Phân Tích]
    H --> H3[Điểm LSP + Phân Tích]
    H --> H4[Điểm ISP + Phân Tích]
    H --> H5[Điểm DIP + Phân Tích]
    
    H1 --> I[Tổng Điểm SOLID]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[Báo Cáo Cuối]
    G --> J
    
    J --> K[Định Dạng Đầu Ra]
    K --> K1[## Tên Chiều]
    K --> K2[✅ Điểm Mạnh]
    K --> K3[⚠️ Lĩnh Vực Cải Thiện]
    K --> K4[**Phân Tích** với Ví Dụ Mã]
    K --> K5[**Điểm**: X/4]
    K --> K6[**Tổng Điểm**: X/20]
    
    classDef input stroke-width:2px;
    classDef decision stroke-width:2px,stroke-dasharray: 5 5;
    classDef process stroke-width:2px;
    classDef analysis stroke-width:2px,fill:#e1f5ff;
    classDef solid stroke-width:2px,fill:#fff3e0;
    classDef output stroke-width:2px,fill:#e8f5e9;
    
    class A input;
    class B,C,E2,E5 decision;
    class D,E,E1,E3,E4,E6,F process;
    class F1,F2,F3,F4,F5,F6,F7 analysis;
    class H,H1,H2,H3,H4,H5 solid;
    class G,I,J,K,K1,K2,K3,K4,K5,K6 output;
```

### Ví Đầu Ra Phân Tích SOLID

Khi phân tích mã, DeepWiki cung cấp phản hồi có cấu trúc như sau:

```markdown
## Nguyên Tắc SOLID

### Nguyên Tắc Trách Nhiệm Đơn (SRP)
**Điểm**: 3/4
✅ **Điểm Mạnh**: Lớp UserService có trách nhiệm rõ ràng và tập trung
⚠️ **Lĩnh Vực Cải Thiện**: UserController trộn lẫn ghi nhật ký với logic kinh doanh
**Phân Tích**: Lớp UserService được thiết kế tốt với một trách nhiệm duy nhất. Tuy nhiên, UserController vi phạm SRP bằng cách xử lý cả yêu cầu HTTP và mối quan tâm ghi nhật ký.

### Nguyên Tắc Mở-Đóng (OCP)
**Điểm**: 2/4
✅ **Điểm Mạnh**: Giao diện PaymentProcessor cho phép mở rộng
⚠️ **Lĩnh Vực Cải Thiện**: Thêm các loại thanh toán mới yêu cầu sửa đổi câu lệnh switch hiện có
**Phân Tích**: Mặc dù giao diện hỗ trợ mở rộng, việc thực hiện sử dụng logic điều kiện vi phạm OCP. Cân nhắc sử dụng mẫu Strategy.

[... tiếp tục cho LSP, ISP, DIP ...]

**Tổng Điểm SOLID**: 14/20
```

""",
    "README.pt-br.md": """## 🧠 Análise de Código e Avaliação de Princípios SOLID

DeepWiki inclui capacidades abrangentes de análise de código com avaliação automática de princípios SOLID:

### Dimensões de Análise

DeepWiki analisa código em **7 dimensões principais**:

1. **Design de Arquitetura** - Padrões de design, padrões arquiteturais, separação de preocupações
2. **Princípios SOLID** - Avaliação automatizada com pontuação (0-4 por princípio, 0-20 total)
3. **Qualidade Integrada** - Legibilidade de código, cobertura de testes, tratamento de erros, segurança
4. **Code Smells e Refatoração** - Identificar anti-padrões e sugerir melhorias
5. **Aplicação de Padrões de Design** - Avaliar uso de padrões e sugerir alternativas
6. **Gestão de Dependências** - Analizar acoplamento, dependências circulares
7. **Níveis de Abstração** - Avaliar interfaces, encapsulamento, hierarquias de abstração

### Pontuação de Princípios SOLID

Cada princípio SOLID é avaliado numa **escala de 0-4**:

- **4 pontos**: Implementação excelente, segue o princípio perfeitamente
- **3 pontos**: Boa implementação, problemas menores
- **2 pontos**: Implementação moderada, algumas violações
- **1 ponto**: Implementação fraca, violações significativas
- **0 pontos**: Não adere ao princípio

**Pontuação Total SOLID**: Soma de todos os 5 princípios (0-20)

### Fluxo de Análise

```mermaid
graph TD
    A[Consulta do Usuário] --> B{Tipo de Consulta?}
    B -->|Análise de Código| C{Profundidade de Pesquisa?}
    B -->|Pergunta Simples| D[SIMPLE_CHAT_SYSTEM_PROMPT]
    C -->|Pesquisa Profunda| E[Iterações DEEP_RESEARCH]
    C -->|Análise Rápida| D
    
    E --> E1[Iteração 1: Plano de Pesquisa]
    E1 --> E2{Mais Iterações?}
    E2 -->|Sim| E3[Iterações Intermediárias]
    E3 --> E4[Iteração 2-3: Aprofundamento]
    E4 --> E5{Iteração Final?}
    E5 -->|Não| E3
    E5 -->|Sim| E6[Iteração Final]
    E2 -->|Não| E6
    
    D --> F[Aplicar Framework de Análise]
    E6 --> F
    
    F --> F1[Dimensão 1: Design de Arquitetura]
    F --> F2[Dimensão 2: Princípios SOLID]
    F --> F3[Dimensão 3: Qualidade Integrada]
    F --> F4[Dimensão 4: Code Smells]
    F --> F5[Dimensão 5: Padrões de Design]
    F --> F6[Dimensão 6: Dependências]
    F --> F7[Dimensão 7: Abstração]
    
    F1 --> G[Criar Relatório Estruturado]
    F2 --> H[Análise de Princípios SOLID]
    F3 --> G
    F4 --> G
    F5 --> G
    F6 --> G
    F7 --> G
    
    H --> H1[Pontuação SRP + Análise]
    H --> H2[Pontuação OCP + Análise]
    H --> H3[Pontuação LSP + Análise]
    H --> H4[Pontuação ISP + Análise]
    H --> H5[Pontuação DIP + Análise]
    
    H1 --> I[Pontuação Total SOLID]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[Relatório Final]
    G --> J
    
    J --> K[Formato de Saída]
    K --> K1[## Nome da Dimensão]
    K --> K2[✅ Pontos Fortes]
    K --> K3[⚠️ Áreas de Melhoria]
    K --> K4[**Análise** com Exemplos de Código]
    K --> K5[**Pontuação**: X/4]
    K --> K6[**Pontuação Total**: X/20]
    
    classDef input stroke-width:2px;
    classDef decision stroke-width:2px,stroke-dasharray: 5 5;
    classDef process stroke-width:2px;
    classDef analysis stroke-width:2px,fill:#e1f5ff;
    classDef solid stroke-width:2px,fill:#fff3e0;
    classDef output stroke-width:2px,fill:#e8f5e9;
    
    class A input;
    class B,C,E2,E5 decision;
    class D,E,E1,E3,E4,E6,F process;
    class F1,F2,F3,F4,F5,F6,F7 analysis;
    class H,H1,H2,H3,H4,H5 solid;
    class G,I,J,K,K1,K2,K3,K4,K5,K6 output;
```

### Exemplo de Saída de Análise SOLID

Ao analisar código, DeepWiki fornece feedback estruturado como este:

```markdown
## Princípios SOLID

### Princípio da Responsabilidade Única (SRP)
**Pontuação**: 3/4
✅ **Pontos Fortes**: A classe UserService tem uma responsabilidade clara e focada
⚠️ **Áreas de Melhoria**: UserController mistura registro com lógica de negócio
**Análise**: A classe UserService está bem projetada com uma única responsabilidade. No entanto, UserController viola SRP ao manipular tanto solicitações HTTP quanto preocupações de registro.

### Princípio Aberto-Fechado (OCP)
**Pontuação**: 2/4
✅ **Pontos Fortes**: A interface PaymentProcessor permite extensões
⚠️ **Áreas de Melhoria**: Adicionar novos tipos de pagamento requer modificar a instrução switch existente
**Análise**: Embora a interface suporte extensões, a implementação usa lógica condicional que viola OCP. Considere usar o padrão Strategy.

[... continua para LSP, ISP, DIP ...]

**Pontuação Total SOLID**: 14/20
```

""",
    "README.fr.md": """## 🧠 Analyse de Code et Évaluation des Principes SOLID

DeepWiki inclut des capacités complètes d'analyse de code avec une évaluation automatique des principes SOLID :

### Dimensions de l'Analyse

DeepWiki analyse le code sur **7 dimensions clés** :

1. **Conception d'Architecture** - Modèles de conception, modèles architecturaux, séparation des préoccupations
2. **Principes SOLID** - Évaluation automatisée avec score (0-4 par principe, 0-20 total)
3. **Qualité Intégrée** - Lisibilité du code, couverture des tests, gestion des erreurs, sécurité
4. **Code Smells et Refactorisation** - Identifier les anti-patterns et suggérer des améliorations
5. **Application des Modèles de Conception** - Évaluer l'utilisation des modèles et suggérer des alternatives
6. **Gestion des Dépendances** - Analyser le couplage, les dépendances circulaires
7. **Niveaux d'Abstraction** - Évaluer les interfaces, l'encapsulation, les hiérarchies d'abstraction

### Score des Principes SOLID

Chaque principe SOLID est évalué sur une **échelle de 0-4** :

- **4 points** : Implémentation excellente, suit parfaitement le principe
- **3 points** : Bonne implémentation, problèmes mineurs
- **2 points** : Implémentation modérée, quelques violations
- **1 point** : Mauvaise implémentation, violations significatives
- **0 point** : N'adhère pas au principe

**Score Total SOLID** : Somme des 5 principes (0-20)

### Flux d'Analyse

```mermaid
graph TD
    A[Requête Utilisateur] --> B{Type de Requête?}
    B -->|Analyse de Code| C{Profondeur de Recherche?}
    B -->|Question Simple| D[SIMPLE_CHAT_SYSTEM_PROMPT]
    C -->|Recherche Approfondie| E[Itérations DEEP_RESEARCH]
    C -->|Analyse Rapide| D
    
    E --> E1[Itération 1: Plan de Recherche]
    E1 --> E2{Plus d'Itérations?}
    E2 -->|Oui| E3[Itérations Intermédiaires]
    E3 --> E4[Itération 2-3: Approfondissement]
    E4 --> E5{Itération Finale?}
    E5 -->|Non| E3
    E5 -->|Oui| E6[Itération Finale]
    E2 -->|Non| E6
    
    D --> F[Appliquer le Framework d'Analyse]
    E6 --> F
    
    F --> F1[Dimension 1: Conception d'Architecture]
    F --> F2[Dimension 2: Principes SOLID]
    F --> F3[Dimension 3: Qualité Intégrée]
    F --> F4[Dimension 4: Code Smells]
    F --> F5[Dimension 5: Modèles de Conception]
    F --> F6[Dimension 6: Dépendances]
    F --> F7[Dimension 7: Abstraction]
    
    F1 --> G[Générer un Rapport Structuré]
    F2 --> H[Analyse des Principes SOLID]
    F3 --> G
    F4 --> G
    F5 --> G
    F6 --> G
    F7 --> G
    
    H --> H1[Score SRP + Analyse]
    H --> H2[Score OCP + Analyse]
    H --> H3[Score LSP + Analyse]
    H --> H4[Score ISP + Analyse]
    H --> H5[Score DIP + Analyse]
    
    H1 --> I[Score Total SOLID]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[Rapport Final]
    G --> J
    
    J --> K[Format de Sortie]
    K --> K1[## Nom de la Dimension]
    K --> K2[✅ Forces]
    K --> K3[⚠️ Axes d'Amélioration]
    K --> K4[**Analyse** avec Exemples de Code]
    K --> K5[**Score** : X/4]
    K --> K6[**Score Total** : X/20]
    
    classDef input stroke-width:2px;
    classDef decision stroke-width:2px,stroke-dasharray: 5 5;
    classDef process stroke-width:2px;
    classDef analysis stroke-width:2px,fill:#e1f5ff;
    classDef solid stroke-width:2px,fill:#fff3e0;
    classDef output stroke-width:2px,fill:#e8f5e9;
    
    class A input;
    class B,C,E2,E5 decision;
    class D,E,E1,E3,E4,E6,F process;
    class F1,F2,F3,F4,F5,F6,F7 analysis;
    class H,H1,H2,H3,H4,H5 solid;
    class G,I,J,K,K1,K2,K3,K4,K5,K6 output;
```

### Exemple de Sortie d'Analyse SOLID

Lors de l'analyse du code, DeepWiki fournit des commentaires structurés comme celui-ci :

```markdown
## Principes SOLID

### Principe de la Responsabilité Unique (SRP)
**Score** : 3/4
✅ **Forces** : La classe UserService a une responsabilité claire et ciblée
⚠️ **Axes d'Amélioration** : UserController mélange la journalisation avec la logique métier
**Analyse** : La classe UserService est bien conçue avec une seule responsabilité. Cependant, UserController viole SRP en gérant à la fois les requêtes HTTP et les préoccupations de journalisation.

### Principe Ouvert-Fermé (OCP)
**Score** : 2/4
✅ **Forces** : L'interface PaymentProcessor permet des extensions
⚠️ **Axes d'Amélioration** : Ajouter de nouveaux types de paiement nécessite de modifier l'instruction switch existante
**Analyse** : Bien que l'interface prenne en charge les extensions, l'implémentation utilise une logique conditionnelle qui viole OCP. Envisagez d'utiliser le pattern Strategy.

[... continue pour LSP, ISP, DIP ...]

**Score Total SOLID** : 14/20
```

""",
    "README.ru.md": """## 🧠 Анализ кода и оценка принципов SOLID

DeepWiki включает комплексные возможности анализа кода с автоматической оценкой принципов SOLID:

### Размеры анализа

DeepWiki анализирует код по **7 ключевым измерениям**:

1. **Архитектурный дизайн** - Паттерны проектирования, архитектурные паттерны, разделение задач
2. **Принципы SOLID** - Автоматизированная оценка с баллами (0-4 за каждый принцип, 0-20 всего)
3. **Встроенное качество** - Читаемость кода, покрытие тестами, обработка ошибок, безопасность
4. **Кодовые запахи и рефакторинг** - Идентификация анти-паттернов и предложения по улучшению
5. **Применение паттернов проектирования** - Оценка использования паттернов и предложений альтернатив
6. **Управление зависимостями** - Анализ связывания, циклических зависимостей
7. **Уровни абстракции** - Оценка интерфейсов, инкапсуляции, иерархий абстракции

### Оценка принципов SOLID

Каждый принцип SOLID оценивается по **шкале 0-4**:

- **4 балла**: Отличное воплощение, идеально следует принципу
- **3 балла**: Хорошее воплощение, незначительные проблемы
- **2 балла**: Умеренное воплощение, некоторые нарушения
- **1 балл**: Плохое воплощение, значительные нарушения
- **0 баллов**: Не следует принципу

**Общий балл SOLID**: Сумма всех 5 принципов (0-20)

### Поток анализа

```mermaid
graph TD
    A[Запрос пользователя] --> B{Тип запроса?}
    B -->|Анализ кода| C{Глубина исследования?}
    B -->|Простой вопрос| D[SIMPLE_CHAT_SYSTEM_PROMPT]
    C -->|Глубокое исследование| E[Итерации DEEP_RESEARCH]
    C -->|Быстрый анализ| D
    
    E --> E1[Итерация 1: План исследования]
    E1 --> E2{Больше итераций?}
    E2 -->|Да| E3[Промежуточные итерации]
    E3 --> E4[Итерация 2-3: Углубление]
    E4 --> E5{Последняя итерация?}
    E5 -->|Нет| E3
    E5 -->|Да| E6[Последняя итерация]
    E2 -->|Нет| E6
    
    D --> F[Применить фреймворк анализа]
    E6 --> F
    
    F --> F1[Измерение 1: Архитектурный дизайн]
    F --> F2[Измерение 2: Принципы SOLID]
    F --> F3[Измерение 3: Встроенное качество]
    F --> F4[Измерение 4: Кодовые запахи]
    F --> F5[Измерение 5: Паттерны проектирования]
    F --> F6[Измерение 6: Зависимости]
    F --> F7[Измерение 7: Абстракция]
    
    F1 --> G[Создать структурированный отчет]
    F2 --> H[Анализ принципов SOLID]
    F3 --> G
    F4 --> G
    F5 --> G
    F6 --> G
    F7 --> G
    
    H --> H1[Балл SRP + Анализ]
    H --> H2[Балл OCP + Анализ]
    H --> H3[Балл LSP + Анализ]
    H --> H4[Балл ISP + Анализ]
    H --> H5[Балл DIP + Анализ]
    
    H1 --> I[Общий балл SOLID]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[Финальный отчет]
    G --> J
    
    J --> K[Формат вывода]
    K --> K1[## Название измерения]
    K --> K2[✅ Сильные стороны]
    K --> K3[⚠️ Области улучшения]
    K --> K4[**Анализ** с примерами кода]
    K --> K5[**Балл**: X/4]
    K --> K6[**Общий балл**: X/20]
    
    classDef input stroke-width:2px;
    classDef decision stroke-width:2px,stroke-dasharray: 5 5;
    classDef process stroke-width:2px;
    classDef analysis stroke-width:2px,fill:#e1f5ff;
    classDef solid stroke-width:2px,fill:#fff3e0;
    classDef output stroke-width:2px,fill:#e8f5e9;
    
    class A input;
    class B,C,E2,E5 decision;
    class D,E,E1,E3,E4,E6,F process;
    class F1,F2,F3,F4,F5,F6,F7 analysis;
    class H,H1,H2,H3,H4,H5 solid;
    class G,I,J,K,K1,K2,K3,K4,K5,K6 output;
```

### Пример вывода анализа SOLID

При анализе кода DeepWiki предоставляет структурированную обратную связь, подобную этой:

```markdown
## Принципы SOLID

### Принцип единой ответственности (SRP)
**Балл**: 3/4
✅ **Сильные стороны**: Класс UserService имеет четкую и сфокусированную ответственность
⚠️ **Области улучшения**: UserController смешивает логирование с бизнес-логикой
**Анализ**: Класс UserService хорошо спроектирован с единственной ответственностью. Однако, UserController нарушает SRP, обрабатывая как HTTP-запросы, так и задачи логирования.

### Принцип открытости-закрытости (OCP)
**Балл**: 2/4
✅ **Сильные стороны**: Интерфейс PaymentProcessor позволяет расширения
⚠️ **Области улучшения**: Добавление новых типов платежей требует изменения существующего оператора switch
**Анализ**: Хотя интерфейс поддерживает расширения, реализация использует условную логику, которая нарушает OCP. Рассмотрите использование паттерна Strategy.

[... продолжается для LSP, ISP, DIP ...]

**Общий балл SOLID**: 14/20
```

"""
}

# Map of filename to the "Project Structure" heading in that language
PROJECT_STRUCTURE_HEADINGS = {
    "README.zh.md": "## 🛠️ 项目结构",
    "README.zh-tw.md": "## 🛠️ 專案結構",
    "README.ja.md": "## 🛠️ プロジェクト構造",
    "README.es.md": "## 🛠️ Estructura del Proyecto",
    "README.kr.md": "## 🛠️ 프로젝트 구조",
    "README.vi.md": "## 🛠️ Cấu trúc dự án",
    "README.pt-br.md": "## 🛠️ Estrutura do Projeto",
    "README.fr.md": "## 🛠️ Structure du Projet",
    "README.ru.md": "## 🛠️ Структура проекта"
}

def update_readme(filename, new_section):
    """Update a README file with the code analysis section"""
    filepath = f"/Users/lei/Documents/deepwiki-open/{filename}"
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Get the correct heading for this language
        heading = PROJECT_STRUCTURE_HEADINGS.get(filename)
        if not heading:
            print(f"✗ {filename}: Unknown file")
            return
        
        # Find the insertion point
        if heading in content:
            # Check if section already exists
            if '🧠 Code Analysis' in content or '🧠 代码分析' in content or '🧠 程式碼分析' in content or '🧠 コード分析' in content:
                print(f"✓ {filename}: Code analysis section already exists, skipping")
                return
            
            # Insert the new section before Project Structure
            new_content = content.replace(
                heading,
                new_section + heading
            )
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"✓ {filename}: Successfully added code analysis section")
        else:
            print(f"✗ {filename}: Could not find insertion point '{heading}'")
            
    except FileNotFoundError:
        print(f"✗ {filename}: File not found")
    except Exception as e:
        print(f"✗ {filename}: Error - {e}")

def main():
    """Update all non-English README files"""
    print("Starting batch update of README files...")
    print("=" * 60)
    
    # Get all README files except English one
    readme_files = list(NEW_SECTIONS.keys())
    
    for filename in readme_files:
        update_readme(filename, NEW_SECTIONS[filename])
    
    print("=" * 60)
    print(f"\n✓ Update completed! Processed {len(readme_files)} files.")

if __name__ == "__main__":
    main()
