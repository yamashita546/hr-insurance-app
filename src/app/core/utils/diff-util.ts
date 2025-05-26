export class DiffUtil {
  /**
   * 指定したkeyの値が異なる場合trueを返す
   */
  static isChanged<T>(original: T | null, edited: T | null, key: keyof T): boolean {
    if (!original || !edited) return false;
    return original[key] !== edited[key];
  }

  /**
   * ネストしたオブジェクトの差分判定（例: address.city など）
   */
  static isChangedDeep(original: any, edited: any, path: string): boolean {
    if (!original || !edited) return false;
    const get = (obj: any, path: string) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
    return get(original, path) !== get(edited, path);
  }
} 