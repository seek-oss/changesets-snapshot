import { type ExecOptions, exec } from '@actions/exec';

export type CommandOptions = Pick<
  ExecOptions,
  'cwd' | 'env' | 'ignoreReturnCode'
>;

export const execWithOutput = async (
  command: string,
  args?: string[],
  options?: CommandOptions,
) => {
  let myOutput = '';
  let myError = '';

  return {
    code: await exec(command, args, {
      listeners: {
        stdout: (data: Buffer) => {
          myOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          myError += data.toString();
        },
      },
      ...options,
    }),
    stdout: myOutput,
    stderr: myError,
  };
};
