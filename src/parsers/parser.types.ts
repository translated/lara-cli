export interface PoKey {
  msgid: string;
  msgctxt?: string;
  msgid_plural?: string;
  idx?: number;
  order?: number;
}

export type PoParserOptionsType = {
  targetLocale: string;
};

export type JsonParserOptionsType = {
  indentation: string | number;
  trailingNewline: string;
};

export type CommonParserOptionsType = {
  locale?: string;
};

export type TsParserOptionsType = {
  originalContent?: string | Buffer;
};

export type ParserOptionsType = Partial<
  PoParserOptionsType & JsonParserOptionsType & CommonParserOptionsType & TsParserOptionsType
>;
