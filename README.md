## Install

### 1. Install package

```shell
npm i -g @steroidsjs/gii-fs
```

### 2. Create config

Create config.json. Sample:

```json
{
    "port": 7800,
    "projects": [
        "/Users/user/Projects/backend-nest"
    ]
}
```

## Start

### Production mode

```shell
gii-fs /path/to/config.json
```

It is not necessary to specify the path to the config. Then will be used the default path ~/gii-fs.json
