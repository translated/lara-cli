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

export type MarkdownParserOptionsType = {
  originalContent: string | Buffer;
};

export type ParserOptionsType = Partial<
  PoParserOptionsType &
    JsonParserOptionsType &
    TsParserOptionsType &
    VueParserOptionsType &
    MarkdownParserOptionsType
>;
