const axios = require('axios');
const NodeRSA = require('node-rsa');
const { stringify } = require('query-string');

const rsaKey =
  '-----BEGIN PUBLIC KEY-----\n' +
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCC+3CidvH/snd26rtAJeWT1+/Q6s/+kda9EOLA\n' +
  'DWR2qA0mIpPRf3IT4+VOA7z6lIigbtDaMkvbEA3z2kzl3fes/2mU9cs+GSGC3ODEEz62SN8gst9P\n' +
  'K0Yqvg27yRQAAfVXelH7ffmdTW5q676E+OTF94fH00ecdHLv6Y/5LaOzGQIDAQAB' +
  '-----END PUBLIC KEY-----';

const ehrDecrypt = params => {
  const { options, token } = params;
  const key = new NodeRSA(options.rsaKey || rsaKey);
  const decrypted = key.decryptPublic(token, 'utf8');
  const userObj = JSON.parse(decrypted);
  return userObj;
};

const getEmpinfo = async params => {
  const { options, ...rest } = params;
  const ehrapi = options.ehrapi;
  const res = await axios({
    baseURL: ehrapi.host,
    method: 'get',
    url: ehrapi.url || '/ehrapi/empinfo',
    params: {
      token: ehrapi.token,
      ...rest
    }
  });

  return (res && res.data) || { code: 1, data: [] };
};

const getEhrUser = async params => {
  const { token, options } = params;

  let account = '';

  if (token) {
    const userObj = ehrDecrypt({ token, options });
    account = userObj.loginId.replace(/@tongdun\.(cn|net)/g, '');
  }

  let empInfo = await getEmpinfo({ account, options });
  empInfo = (empInfo.data && empInfo.data[0]) || {};

  const user = {
    sso: true,
    ehrId: empInfo.eid,
    badge: empInfo.badge,
    nickname: empInfo.name,
    empStatus: empInfo.empstatus,
    email: empInfo.email,
    account: empInfo.account || account,
    depId: empInfo.depid,
    leaderId: empInfo.leaderId,
    roleId: empInfo.roleId
  };
  return user;
};

module.exports = (options = {}) => {
  return async (ctx, next) => {
    const { token, success, ...rest } = ctx.request.query;

    // 退出登录
    if (ctx.path.indexOf(options.logoutUrl || '/api/logout') > -1) {
      const params = {
        logout: true,
        tokenEncoding: true,
        callbackUrl: rest.backUrl || `${ctx.protocol}://${ctx.host}` // 默认退出接口带上当前地址 登录跳回
      };

      ctx.session.user = null;

      return ctx.redirect(`${options.loginUrl}?${stringify(params)}`);
    }
    // backUrl 前端工程接口带过的参数 开发环境
    const restStr = JSON.stringify(rest);
    const backUrl = rest.backUrl || ctx.path + (restStr === '{}' ? '' : `?${stringify(rest)}`);

    if (ctx.session && ctx.session.user && token) {
      ctx.redirect(backUrl);
    } else {
      if (token) {
        const userOne = await getEhrUser({ token, options });
        if (!ctx.session) {
          ctx.session = {};
        }
        ctx.session.user = userOne;

        ctx.redirect(backUrl);
      } else {
        await next();
      }
    }
  };
};
