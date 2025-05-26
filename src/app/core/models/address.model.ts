import { Prefecture } from "./prefecture.model";


export interface Address {
    postalCode: string;         // 郵便番号（例: "100-0001"）
    prefecture: string;     // 都道府県コード（例: "13"）
    city: string;               // 市区町村（例: "千代田区"）
    town: string;               // 町域・丁目（例: "千代田1丁目"）
    streetAddress: string;      // 番地・建物名等（例: "1-1-1 ○○ビル3F"）
    buildingName?: string;      // 任意でビル名を分離管理したい場合
    countryCode?: string;        // 国コード（例: "JP"）※将来の多国籍展開に備えて
  }
  