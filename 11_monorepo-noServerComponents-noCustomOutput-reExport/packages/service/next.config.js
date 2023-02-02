
const path = require('path')
const fs = require('fs/promises')

class PrismaPlugin {
  /**
   * 
   * @param {import('webpack').Compiler} compiler 
   */
  apply(compiler) {
    const { webpack } = compiler;
    const { Compilation, sources } = webpack;

    async function getPrismaPath() {
      return path.dirname(require.resolve('.prisma/client', {paths: [path.dirname(require.resolve('@prisma/client'))]}))
    }

    async function getPrismaFiles() {
      const filter = /schema\.prisma|.*?engine.*?/
      const prismaPath = await getPrismaPath()
      const prismaFiles = await fs.readdir(prismaPath)
      return prismaFiles.filter(file => file.match(filter))
    }

    const updatedOutputs = {}

    compiler.hooks.thisCompilation.tap('PrismaPlugin', (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'PrismaPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
        },
        async (assets) => {
          const assetNames = Object.keys(assets).filter((k) => k.endsWith('.nft.json'))

          const asyncActions = assetNames.map(async (assetName) => {
            // paths
            const outputPath = compiler.options.output.path
            const assetPath = path.resolve(outputPath, assetName)
            const assetDir = path.dirname(assetPath)
            const prismaFiles = await getPrismaFiles()

            // data
            const oldSourceAsset = compilation.getAsset(assetName)
            const oldSourceContents = oldSourceAsset.source.source() + ''
            const ntfLoadedAsJson = JSON.parse(oldSourceContents)

            // update
            prismaFiles.forEach((fileName) => {
              const prismaOutputFilePath = path.join(outputPath, fileName)
              ntfLoadedAsJson.files.push(path.relative(assetDir, prismaOutputFilePath))
            })

            const newSourceContents = new sources.RawSource(JSON.stringify(ntfLoadedAsJson))

            // persist
            compilation.updateAsset(assetName, newSourceContents);
            updatedOutputs[outputPath] = true // mark for later
          })

          await Promise.all(asyncActions)
        }
      );
    });

    compiler.hooks.done.tapPromise(
      'PrismaPlugin',
      async () => {
        const outputPath = compiler.options.output.path

        if (updatedOutputs[outputPath] === true) {
          const prismaPath = await getPrismaPath()
          const prismaFiles = await getPrismaFiles()

          const asyncActions = prismaFiles.map((f) => fs.copyFile(
            path.join(prismaPath, f),
            path.join(outputPath, f)
          ))

          await Promise.all(asyncActions)
        }
      }
    );
  }
}

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  webpack: (config) => {
    config.plugins = [...config.plugins, new PrismaPlugin()]

    return config
  },
}