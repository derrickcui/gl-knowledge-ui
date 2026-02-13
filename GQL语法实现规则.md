下面是基于 整个项目语法实现（以 GQLParser.jjt 为准，结合 gql_operation.md） 给出的完整且严格的语法规则与操作符使用顺序。重点把“操作符顺序/优先级”和“允许的组合位置”写清楚。

1. 顶层结构（入口与互斥规则）
顶层只有两种形式：

(<lang/xx>)? Logic EOF
Like EOF
也就是说：

<like>(...) 只能作为顶层语句，不能与其他逻辑混用。
<lang/xx> 只能出现在最开始的位置。
2. 逻辑操作符优先级（从低到高）
语法实际的解析顺序是“从外到内”，可以理解为优先级由低到高如下：

ACCRUE / OR / ANY

中缀形式：A <accrue> B, A <or> B, A <any> B
前缀形式：<accrue>(...), <or>(...), <any>(...)
AND / ALL

中缀：A <and> B, A <all> B
前缀：<and>(...), <all>(...)
NOT

仅前缀：<not> X
IN + WHEN 结构

field>)? (Proxi | LogicBoost) (<when>(...))?
<when> 只能出现在 <in/field> ... 后面，不能独立出现。
LogicBoost

[number] 可选权重：[3.5] expr
只影响逻辑叶子层。
LogicLeaf（逻辑叶子）

LogicPrefix
<freetext>(...)
(Logic)
{Topic}
3. 近邻/结构运算符优先级（Proxi 体系）
Proxi 是近邻体系的入口，完整层级如下（从外到内）：

Paragraph
Sentence ( (<paragraph>|<order><paragraph>) Sentence )*
Sentence
Near ( (<sentence>|<order><sentence>) Near )*
Near
Phrase ( (<near[/n]>|<order><near[/n]>) Phrase )*
Phrase
ProxiBoost ( <phrase> ProxiBoost )*
ProxiBoost
[number]? ProxiLeaf
ProxiLeaf（近邻叶子）
RelationalTerm
TextFieldOp
terms_opr（普通词项）
ProxiPrefix（如 <near>(...)）
ProxiParen（括号）
4. 前缀操作符集合（必须带括号）

这些只能使用 前缀括号形式：
<op>(a, b, ...)

逻辑类：<accrue> <all> <and> <any> <or>
评分/聚合类：<complement> <logsum/n> <mult/n> <product> <sum> <yesno>
近邻类：<near[/n]> <sentence> <paragraph> <phrase>
5. 可用的“中缀”操作符

逻辑中缀：<accrue> <or> <any> <and> <all>
结构中缀：<near[/n]> <sentence> <paragraph>
关系比较中缀：= != > >= < <=
字段文本中缀：<contains> <starts> <ends> <matches> <substring>
6. <in/field> 与 <when> 的严格位置

<in/field> 只能作为 外层前缀，作用域是“紧随其后的整个表达式”。
<when> 只能跟在该表达式之后出现：
合法形式：

<in/title> <near>(a,b) <when>(FIELD <contains> "x")
非法形式：

<near>(<in/title>a, b)
<when>(...)
7. 词项与修饰符（terms_opr）

中文词项（Ch_term）：

可选 <many>、<case>、<fuzz/n>、<typo/n>、<thesaurus>
例：<many><case><fuzz/2> 关键词
英文词项（En_term）：

<stem> <soundex> <wildcard> <word> <typo> <case>
<case> 后可接 <fuzz/n> / <typo/n> / <thesaurus>
8. 字段操作表达式

字段文本操作：
FIELD <contains|starts|ends|matches|substring> VALUE
字段关系比较：
FIELD < = | != | > | >= | < | <= > VALUE
9. 允许/不允许的组合规则（重要）

允许：

<in/title><near>(a,b)
<order><near/5>(a,b)
<accrue>(<in/title>a, <in/content>b)
(<near>(a,b) <and> <phrase>(c,d))
不允许：

<near>(<in/title>a, <in/content>b)（<in> 不能出现在 Proxi 内部）
<near><in/title>(a,b)（近邻不能直接接 <in>)
<like> 与其它逻辑混用
如果你需要，我可以把这些规则整理成 可执行的 EBNF 或 BNF 版本，或者把“合法/非法示例”做成一张对照表。


那给出创建一个gql的层级关系，例如最底层，我可以使用哪些，怎么使用，然后在逐层递进，知道最外层

下面按“从最底层到最外层”给出 GQL 的层级关系与可用写法。每一层只说明这一层能用什么、怎么写。示例都保持最短合法形式。

层级 0：词项与字面量（最底层）
这一层是“可被近邻/逻辑包起来的最小语义单元”。

普通词项
苹果
apple
加修饰的词项（中英文不同规则）
中文修饰：<many>、<case>、<fuzz/n>、<typo/n>、<thesaurus>
例：<many><case><fuzz/2> 关键词
英文修饰：<stem> <soundex> <wildcard> <word> <typo> <case>
例：<stem> apple
例：<case><fuzz/2> Apple
字段比较（关系运算）
FIELD = 10
FIELD >= 2024
字段文本匹配
TITLE <contains> "abc"
AUTHOR <starts> Jack
层级 1：近邻叶子（ProxiLeaf）
这一层是“近邻体系里允许出现的最小节点”。

词项（层级 0 的所有词项）
字段比较（关系运算）
字段文本匹配
近邻前缀结构（见层级 3）
括号分组（见层级 4）
层级 2：近邻权重（ProxiBoost）
给近邻叶子加权重。

[权重] 叶子
例：[3] 关键词
例：[1.5] TITLE <contains> "abc"
层级 3：短语（Phrase）
多个 ProxiBoost 以 <phrase> 串联。

<phrase>(a, b, c)
等价中缀写法在语法里不是直接支持的，推荐用前缀形式。
层级 4：近邻（Near）
多个 Phrase 以 <near> 连接，支持顺序和距离。

<near>(a, b)
<near/3>(a, b)
<order><near/3>(a, b)
中缀也允许：a <near/3> b，a <order><near/3> b
层级 5：句子（Sentence）
多个 Near 以 <sentence> 连接，支持顺序。

<sentence>(a, b)
<order><sentence>(a, b)
中缀也允许：a <sentence> b，a <order><sentence> b
层级 6：段落（Paragraph）
多个 Sentence 以 <paragraph> 连接，支持顺序。

<paragraph>(a, b)
<order><paragraph>(a, b)
中缀也允许：a <paragraph> b，a <order><paragraph> b
层级 7：近邻体系入口（Proxi）
Proxi 实际就是 Paragraph，上面 3–6 任何一层都可作为 Proxi 的内容。

层级 8：字段限定与条件（In + When）
把字段限定加在外层，并可跟条件。

<in/title> Proxi
<in/title> LogicLeaf
title> ... <when>(条件表达式)
when 内部只允许：
字段比较
字段文本匹配
<and> / <or> / <not> 组合
括号
层级 9：逻辑叶子（LogicLeaf）
逻辑语句的最小可组合单元：

逻辑前缀函数：<and>(...) <or>(...) <accrue>(...) 等
<freetext>(...)
(Logic)
{Topic}
以及 In(...) 包裹的近邻或叶子
层级 10：逻辑操作符（Logic）
完整逻辑表达式，支持前缀和中缀：

前缀：<and>(a, b) <or>(a, b) <accrue>(a, b)
中缀：a <and> b, a <or> b, a <accrue> b
<not> 仅前缀：<not> a
优先级从低到高：
<accrue>/<or>/<any> → <and>/<all> → <not> → In/When → LogicLeaf

层级 11：顶层入口（Root）
只能二选一：

(<lang/xx>)? Logic
<like>(term)
如果你想，我可以把这一套转换成完整的 EBNF 文法，或者做成“合法/非法组合对照表”。


你这还是没有设计层级之间的关系

明白，你要的是“层级之间的关系/嵌套规则”，我用一棵从内到外的结构树来描述，直接体现“谁能包谁、谁只能出现在哪”。

GQL 层级关系（从内到外）

TOKEN
└─ (词项 / 字段比较 / 字段文本匹配 / 引号文本)
   |
   v
terms_opr
└─ Ch_term | En_term
   |
   v
ProxiLeaf
└─ 关系比较 | 文本匹配 | terms_opr | ProxiPrefix | ProxiParen
   |
   v
ProxiBoost
└─ [权重]? ProxiLeaf
   |
   v
Phrase
└─ ProxiBoost ( <phrase> ProxiBoost )*
   |
   v
Near
└─ Phrase ( (<near[/n]> | <order><near[/n]>) Phrase )*
   |
   v
Sentence
└─ Near ( (<sentence> | <order><sentence>) Near )*
   |
   v
Paragraph
└─ Sentence ( (<paragraph> | <order><paragraph>) Sentence )*
   |
   v
Proxi
└─ Paragraph
   |
   v
In
└─ (<in/field>)? ( Proxi | LogicBoost ) (<when>(WhenLogic))?
   |
   v
Not
└─ (<not>)? In
   |
   v
AndAll
└─ Not ( (<and> | <all>) Not )*
   |
   v
AccrueOrAny
└─ AndAll ( (<accrue> | <or> | <any>) AndAll )*
   |
   v
Logic
└─ AccrueOrAny
   |
   v
Root
└─ (<lang/xx>)? Logic | <like>(term)
关键关系点（必须牢记）

<in/field> 只能包住 Proxi 或 LogicBoost，不能出现在 Proxi 内部。
<near>/<sentence>/<paragraph> 是 Proxi 层级内部的结构，只能包/连接 Proxi 相关元素。
逻辑运算符（<and> <or> <any> <accrue>）只能作用于 Logic 层，不能直接出现在 Proxi 里。
<when> 只能挂在 <in/field> 后面，且内部只允许字段比较/文本匹配/逻辑组合。
<like> 只能作为 顶层，不能与 Logic 混用。
如果你希望，我可以把这棵树转成一份 完整 EBNF，并标注每层的“合法/非法示例”。


完整 EBNF.

下面是根据 GQLParser.jjt 直接整理出的 完整 EBNF（保留语法层级与组合关系，未省略关键分支）。

Root            = ( Lang )? Logic EOF | Like EOF ;

Lang            = "<LANG/...>" | "<lang/...>" ;

Like            = "<LIKE>" "(" TERM ")" ;

Logic           = AccrueOrAny ;

AccrueOrAny      = AndAll ( ( ( "<ACCRUE>" | "<accrue>" ) AndAll )+
                          | ( ( "<OR>" | "<or>" ) AndAll )+
                          | ( ( "<ANY>" | "<any>" ) AndAll )+ )* ;

AndAll          = Not ( ( ( "<AND>" | "<and>" ) Not )+
                      | ( ( "<ALL>" | "<all>" ) Not )+ )* ;

Not             = ( "<NOT>" | "<not>" )? WhenWrap ;

WhenWrap        = In ( ( "<WHEN>" | "<when>" ) "(" WhenLogic ")" )? ;

In              = ( "<in/TERM>" )? ( Proxi | LogicBoost ) ;

LogicBoost      = ( "[" TERM "]" )? LogicLeaf ;

LogicLeaf       = LogicPrefix
                | Freetext
                | "(" Logic ")"
                | Topic ;

LogicPrefix     = ( "<ACCRUE>" | "<accrue>" ) "(" LogicPrefixParam ")"
                | ( "<ALL>" | "<all>" ) "(" LogicPrefixParam ")"
                | ( "<AND>" | "<and>" ) "(" LogicPrefixParam ")"
                | ( "<ANY>" | "<any>" ) "(" LogicPrefixParam ")"
                | ( "<OR>" | "<or>" ) "(" LogicPrefixParam ")"
                | ( "<COMPLEMENT>" | "<complement>" ) "(" LogicPrefixParam ")"
                | "<LOGSUM[/n]>" "(" LogicPrefixParam ")"
                | "<MULT[/n]>" "(" LogicPrefixParam ")"
                | ( "<PRODUCT>" | "<product>" ) "(" LogicPrefixParam ")"
                | ( "<SUM>" | "<sum>" ) "(" LogicPrefixParam ")"
                | ( "<YESNO>" | "<yesno>" ) "(" LogicPrefixParam ")" ;

LogicPrefixParam = AccrueOrAny ( "," AccrueOrAny )* ;

Topic           = "{" TERM "}" ;

Proxi           = Paragraph ;

Paragraph       = Sentence ( ( "<ORDER><PARAGRAPH>" | "<order><paragraph>"
                              | "<PARAGRAPH>" | "<paragraph>" )
                              Sentence )* ;

Sentence        = Near ( ( "<SENTENCE>" | "<sentence>"
                          | "<ORDER><SENTENCE>" | "<order><sentence>" )
                          Near )* ;

Near            = Phrase ( ( "<NEAR[/n]>" | "<near[/n]>"
                            | "<ORDER><NEAR[/n]>" | "<order><near[/n]>" )
                            Phrase )* ;

Phrase          = ProxiBoost ( ( "<PHRASE>" | "<phrase>" ) ProxiBoost )* ;

ProxiBoost      = ( "[" TERM "]" )? ProxiLeaf ;

ProxiLeaf       = RelationalTerm
                | TextFieldOp
                | terms_opr
                | ProxiPrefix
                | "(" Proxi ")" ;

ProxiPrefix     = ( ( "<NEAR[/n]>" | "<near[/n]>"
                      | "<ORDER><NEAR[/n]>" | "<order><near[/n]>" )
                    "(" ProxiPrefixParam ")" )
                | ( ( "<PARAGRAPH>" | "<paragraph>"
                      | "<ORDER><PARAGRAPH>" | "<order><paragraph>" )
                    "(" ProxiPrefixParam ")" )
                | ( ( "<SENTENCE>" | "<sentence>"
                      | "<ORDER><SENTENCE>" | "<order><sentence>" )
                    "(" ProxiPrefixParam ")" )
                | ( ( "<PHRASE>" | "<phrase>" )
                    "(" ProxiPrefixParam ")" ) ;

ProxiPrefixParam = Proxi ( "," Proxi )* ;

RelationalTerm  = TERM ( "!=" | ">=" | "<=" | "=" | ">" | "<" ) ( QUOTED | TERM ) ;

TextFieldOp     = TERM ( "<CONTAINS>" | "<contains>"
                       | "<STARTS>" | "<starts>"
                       | "<ENDS>" | "<ends>"
                       | "<MATCHES>" | "<matches>"
                       | "<SUBSTRING>" | "<substring>" )
                  ( QUOTED | TERM ) ;

terms_opr       = Ch_term | En_term ;

Ch_term         = ( "<MANY>" | "<many>" )?
                  ( "<CASE>" | "<case>" )?
                  ( "<FUZZ[/n]>" | "<fuzz[/n]>"
                  | "<TYPO[/n]>" | "<typo[/n]>"
                  | "<THESAURUS>" | "<thesaurus>" )?
                  ( TERM | QUOTED ) ;

En_term         = ( "<STEM>" | "<stem>"
                  | "<SOUNDEX>" | "<soundex>"
                  | "<WILDCARD>" | "<wildcard>"
                  | "<WORD>" | "<word>"
                  | "<TYPO[/n]>" | "<typo[/n]>"
                  | "<CASE>" | "<case>" )
                  ( ( "<FUZZ[/n]>" | "<fuzz[/n]>"
                    | "<TYPO[/n]>" | "<typo[/n]>"
                    | "<THESAURUS>" | "<thesaurus>" ) )?
                  ( TERM | QUOTED ) ;

WhenLogic       = WhenTerm ( ( "<AND>" | "<and>" ) WhenTerm )+
                | WhenTerm ( ( "<OR>" | "<or>" ) WhenTerm )+ ;

WhenTerm        = ( "<NOT>" | "<not>" ) WhenAtom | WhenAtom ;

WhenAtom        = TextFieldOp
                | RelationalTerm
                | "(" WhenLogic ")" ;

Freetext        = ( "<FREETEXT>" | "<freetext>" ) "("
                  ( TERM | QUOTED )
                  ( "," ( TERM | QUOTED ) )*
                  ")" ;

TERM            = (非空白且非语法保留字符的词元) ;
QUOTED          = "\"" ( 转义或非引号字符 )* "\"" ;
EOF             = 结束 ;