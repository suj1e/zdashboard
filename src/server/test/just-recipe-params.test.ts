/**
 * just-log-ux T1 纯函数单测:recipe 签名参数解析(just --show 首行)与 spawn argv 拼装。
 * argv 拼装安全契约:数组 argv 原样传值(值含空格/引号/& 不经 shell 拼接),调用方 spawn 不得开 shell。
 */
import { describe, it, expect } from 'vitest';
import { parseRecipeSignature, buildJustArgv } from '../just-recipe-params.js';

describe('parseRecipeSignature — just --show 首行签名解析', () => {
  it('playground 样例:hello msg="world": → params ["msg"]', () => {
    expect(parseRecipeSignature('hello msg="world":')).toEqual({ name: 'hello', params: ['msg'] });
  });

  it('多参数混排:deploy env="staging" tag="v1": → ["env","tag"]', () => {
    expect(parseRecipeSignature('deploy env="staging" tag="v1":')).toEqual({ name: 'deploy', params: ['env', 'tag'] });
  });

  it('无参 recipe:build: → []', () => {
    expect(parseRecipeSignature('build:')).toEqual({ name: 'build', params: [] });
  });

  it('无引号默认值:a=1 b=2 → ["a","b"]', () => {
    expect(parseRecipeSignature('foo a=1 b=2:')).toEqual({ name: 'foo', params: ['a', 'b'] });
  });

  it('单引号默认值:a=\'x y\' → ["a"]', () => {
    expect(parseRecipeSignature("foo a='x y':")).toEqual({ name: 'foo', params: ['a'] });
  });

  it('variadic + 参数与 $ 变长参数剥前缀取名', () => {
    expect(parseRecipeSignature('foo +flags:')?.params).toEqual(['flags']);
    expect(parseRecipeSignature('foo $rest:')?.params).toEqual(['rest']);
  });

  it('纯位置参数(无默认值)→ 取参数名', () => {
    expect(parseRecipeSignature('copy src dest:')).toEqual({ name: 'copy', params: ['src', 'dest'] });
  });

  it('recipe 名含连字符/下划线数字', () => {
    expect(parseRecipeSignature('build-all_2 x=1:')).toEqual({ name: 'build-all_2', params: ['x'] });
  });

  it('容忍行尾空白与尾部冒号后的注释', () => {
    expect(parseRecipeSignature('hello msg="x":  # greeting')).toEqual({ name: 'hello', params: ['msg'] });
  });

  it('首部 @ 前缀剥掉(private recipe)', () => {
    expect(parseRecipeSignature('@hello msg="x":')?.name).toBe('hello');
  });

  it('无冒号/空行等非法签名 → null(调用方跳过)', () => {
    expect(parseRecipeSignature('')).toBeNull();
    expect(parseRecipeSignature('just --show hello')).toBeNull();
    expect(parseRecipeSignature('   ')).toBeNull();
  });
});

describe('buildJustArgv — spawn argv 拼装(特殊字符安全)', () => {
  it('无参 → [recipe]', () => {
    expect(buildJustArgv('build')).toEqual(['build']);
  });

  it('args undefined → [recipe](与缺省一致)', () => {
    expect(buildJustArgv('build', undefined)).toEqual(['build']);
  });

  it('单参数 → [recipe, "k=v"]', () => {
    expect(buildJustArgv('hello', { msg: 'x' })).toEqual(['hello', 'msg=x']);
  });

  it('多参数按插入顺序追加', () => {
    expect(buildJustArgv('deploy', { env: 'prod', tag: 'v2' })).toEqual(['deploy', 'env=prod', 'tag=v2']);
  });

  it('值含空格 → 仍为单个 argv 元素(数组传递,不串位)', () => {
    const argv = buildJustArgv('hello', { msg: 'hello world' });
    expect(argv).toEqual(['hello', 'msg=hello world']);
    expect(argv).toHaveLength(2);
  });

  it('值含引号/美元/反引号等 shell 元字符 → 原样保留,不做转义也不拼接', () => {
    expect(buildJustArgv('hello', { msg: 'a"&`$(whoami)`' })).toEqual(['hello', 'msg=a"&`$(whoami)`']);
  });

  it('值本身含 = → 原样拼接,由 just 侧按首个 = 切分', () => {
    expect(buildJustArgv('hello', { msg: 'a=b' })).toEqual(['hello', 'msg=a=b']);
  });

  it('值含换行/CR → 原样保留(argv 不受控制字符影响)', () => {
    expect(buildJustArgv('hello', { msg: 'a\nb' })).toEqual(['hello', 'msg=a\nb']);
  });
});
