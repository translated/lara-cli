export interface PoKey {
  msgid: string;
  msgctxt?: string;
  msgid_plural?: string;
  idx?: number;
  order?: number;
}

type BaseContentParserOptionsType = {
  originalContent: string | Buffer;
  targetLocale: string;
  // The existing target file content. Used by merge-based parsers to preserve
  // "orphan" keys (present in the target but absent from the source). Empty/undefined
  // when the target does not exist yet.
  targetContent?: string | Buffer;
};

export type PoParserOptionsType = {
  targetLocale: string;
};

export type JsonParserOptionsType = {
  indentation: string | number;
  trailingNewline: string;
};

export type TsParserOptionsType = BaseContentParserOptionsType;

export type VueParserOptionsType = BaseContentParserOptionsType;

export type MarkdownParserOptionsType = BaseContentParserOptionsType;

export type AndroidXmlParserOptionsType = BaseContentParserOptionsType;

export type XcodeStringsParserOptionsType = BaseContentParserOptionsType;

export type XcodeStringsdictParserOptionsType = BaseContentParserOptionsType;

export type XcodeXcstringsParserOptionsType = BaseContentParserOptionsType;

export type TxtParserOptionsType = BaseContentParserOptionsType;

export type ParserOptionsType = Partial<
  PoParserOptionsType &
    JsonParserOptionsType &
    TsParserOptionsType &
    VueParserOptionsType &
    MarkdownParserOptionsType &
    AndroidXmlParserOptionsType &
    XcodeStringsParserOptionsType &
    XcodeStringsdictParserOptionsType &
    XcodeXcstringsParserOptionsType &
    TxtParserOptionsType
>;
