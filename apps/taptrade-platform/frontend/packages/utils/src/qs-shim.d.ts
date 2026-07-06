// Build shim: @taptrade-ui/utils' tsc build runs with noImplicitAny and the
// `qs` runtime dep ships no bundled types, while @types/qs is absent from the
// frozen lockfile. Ambient-declare it so the workspace library compiles in a
// clean Docker build. Pre-existing TS-debt papered over for the demo image;
// the proper fix is adding @types/qs to packages/utils devDependencies.
declare module "qs";
