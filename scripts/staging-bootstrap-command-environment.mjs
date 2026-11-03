/** Force the terminal launch:p0 check to perform its actual nested validations.
 * A listing-only dry run must never contribute a passing bootstrap receipt. */
export function stagingBootstrapCommandEnvironment(command, args, sourceEnv) {
  const env = { ...sourceEnv };
  if (command === 'npm' && Array.isArray(args) && args.length === 2 &&
      args[0] === 'run' && args[1] === 'launch:p0') {
    env.URAI_P0_RUN_COMMANDS = '1';
  }
  return env;
}
