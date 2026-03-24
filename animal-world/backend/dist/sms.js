/**
 * 短信发送模块
 * 功能：活动报名手机验证码
 * 开发模式：打印到控制台；生产环境：需配置阿里云/腾讯云等 SMS 接口
 */
export async function sendSmsCode(phone, code) {
    const provider = process.env.SMS_PROVIDER?.toLowerCase();
    if (provider === 'aliyun' || provider === 'tencent') {
        // TODO: 接入阿里云/腾讯云短信 API
        // 需配置：SMS_ACCESS_KEY, SMS_SECRET, SMS_SIGN, SMS_TEMPLATE_ID 等
        console.warn('[SMS] 短信服务未配置，请在 .env 中配置 SMS_* 或在开发环境查看控制台验证码');
        console.log(`[Dev] 手机 ${phone} 验证码: ${code}`);
        return true;
    }
    console.log(`[Dev] 报名验证码已生成，手机 ${phone} 验证码: ${code} (5分钟有效)`);
    return true;
}
