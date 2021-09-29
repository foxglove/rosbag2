# @foxglove/rosbag2

> _ROS2 (Robot Operating System) bag reader and writer abstract implementation_

[![npm version](https://img.shields.io/npm/v/@foxglove/rosbag2.svg?style=flat)](https://www.npmjs.com/package/@foxglove/rosbag2)

#### Developers: Use [@foxglove/rosbag2-node](https://github.com/foxglove/rosbag2-node) or [@foxglove/rosbag2-web](https://github.com/foxglove/rosbag2-web)

This package contains the subset of the full rosbag2 implementation that can be shared across node.js and web environments. It cannot read or write rosbag2 files on its own. You are probably looking for the [@foxglove/rosbag2-node](https://github.com/foxglove/rosbag2-node) or [@foxglove/rosbag2-web](https://github.com/foxglove/rosbag2-web) package unless you are writing your own bag parsing implementation.

## License

@foxglove/rosbag2 is licensed under [MIT License](https://opensource.org/licenses/MIT).

## Releasing

1. Run `yarn version --[major|minor|patch]` to bump version
2. Run `git push && git push --tags` to push new tag
3. GitHub Actions will take care of the rest

## Stay in touch

Join our [Slack channel](https://foxglove.dev/join-slack) to ask questions, share feedback, and stay up to date on what our team is working on.
