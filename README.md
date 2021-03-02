# sso-longin koa 统一登录中间件
----

## 安装

```bash
npm i -g @tntd/sso-login 
```

## 使用

```bash
const Koa = require('koa');
const ssoLogin = require('@tntd/sso-login ');
const app = new Koa();

app.use(ssoLogin(options)); // options 为 JSON object
```

## options
	
| key	      | 是否必填     | 描述						|
| ---		  | ---       | ---								|
| rsaKey	  | 否		    | E-hr node 解密key				|
| logoutUrl   | 否		    | 退出接口，默认 '/api/logout'			|
| loginUrl	  | 是			| 登录页面地址，参考下面统一登录		|
| ehrapi      | 是         	| 参考 ehrapi 描述					|

### ehrapi 描述
```
ehrapi = { 
	host: "",  
	url: '/ehrapi/empinfo',  // 建议不填，除非接口地址变更了
	token: ""
}
```


> * [E-hr文档](http://wiki.tongdun.me/pages/viewpage.action?pageId=24612750)
> * [统一登录](http://wiki.tongdun.me/pages/viewpage.action?pageId=20160266#id-%E5%86%85%E9%83%A8%E7%BB%9F%E4%B8%80%E7%99%BB%E5%BD%95web%E6%96%B9%E5%BC%8F%E6%8E%A5%E5%85%A5%E6%8C%87%E5%8D%97-4.node%E7%89%88%E6%9C%AC)
> * [host列表文档](http://wiki.tongdun.me/pages/viewpage.action?pageId=31629956)

## 上下文挂载用户信息

```
ctx.session.user = {
    sso: true,
    ehrId: '',
    badge: '',
    nickname: '',
    empStatus: '',
    email: '',
    account: '',
    depId: '',
    leaderId: '',
    roleId: ''
};
```
### 字段描述 具体类型，参考返回值

| 字段	      | 类型     | 是否为空						| 说明 |
| ---		  | ---       | ---						 | --- |
| sso	  | Boolean		    | 否				| 上下文二次挂载用户新标识，默认 true	|
| ehrId	  | int		    | 否				| 员工ID	|
| badge   | String		  | 否			| 员工工号	|
| nickname	  | String	 |否		| 员工姓名	|
| empStatus      | int   | 否					| 在职状态：1-在职；2-离职	|
| email      | String         	| 否					| email	|
| account      | String         	| 否	 | AD账号	|
| depId      | String         	| 否					| 所在部门id	|
| leaderId      | int        	| 否					| 直接汇报对象人员ID	|
| roleId      | int         	| 否				| 在职状态：1-在职；2-离职 |

## 二次上下文挂载当前系统用户信息


### format-session.js 中间件
```
const UserDao = require('daos/user');
const userDao = new UserDao();

module.exports = (options = {}) => {
	return async (ctx, next) => {
		if (ctx.session && ctx.session.user && ctx.session.user.sso) { // sso 标识
			let userOne = await userDao.findOne({
				where: {
					account: ctx.session.user.account
				}
			});// 根据域账号 获取用户信息
			if (!userOne) {// 当前系统没用找到用户，立即新增用户
				userOne = await userDao.create({ ...ctx.session.user });
			}
			ctx.session.user = {
				...userOne.dataValues,
				password: undefined
			};
		} else {
			await next();
		}
	};
};
```

```
const Koa = require('koa');
const ssoLogin = require('@tntd/sso-login ');
const app = new Koa();

app.use(ssoLogin(options)); // options 为 JSON object
app.use(formatSession());// 上面的中间件
```
