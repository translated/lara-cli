declare module '@babel/traverse' {
  import type { Node, VariableDeclarator } from '@babel/types';

  export interface NodePath<T extends Node = Node> {
    node: T;
    stop(): void;
    skip(): void;
  }

  export interface TraverseOptions {
    VariableDeclarator?: (path: NodePath<VariableDeclarator>) => void;
    [key: string]: ((path: NodePath<Node>) => void) | undefined;
  }

  export interface TraverseFunction {
    (ast: Node, opts: TraverseOptions): void;
    default?: TraverseFunction;
  }

  const traverse: TraverseFunction;
  export default traverse;
}

