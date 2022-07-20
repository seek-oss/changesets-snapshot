import { exec } from '@actions/exec';

export const execWithOutput = async (
  command: string,
  args?: string[],
  options?: { ignoreReturnCode?: boolean; cwd?: string },
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
