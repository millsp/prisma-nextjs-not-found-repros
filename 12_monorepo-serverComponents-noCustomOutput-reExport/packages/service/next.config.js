
const path = require('path')

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  experimental: {
    appDir: true,
  //   outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  // webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
  //   config.externals = [...config.externals, 'db']

  //   return config
  // },
}