# 叙事图谱

一个用于整理故事项目、人物档案、时间线与人物关系的响应式网页工作台。数据保存在 Supabase 云端，同一账号可以在不同设备上查看和编辑。

## 当前功能

- 邮箱和密码注册、登录
- 创建多个故事项目
- 人物档案、出生和去世日期
- 事件时间线，支持精确日期或故事内的自定义纪年
- 时间线可切换正序/倒序，并能在任意相邻事件之间插入新事件
- 可切换全景或单个人物视角；人物和事件日期都可以自选颜色
- 人物视角显示事件发生时的年龄轴，缺少日期时标记为待定
- 事件关联多个人物，并按精确生日和事件日期显示人物年龄
- 人物关系及关系时间段
- 人物关系网视图，也可切换明细列表
- 实时更新订阅；窗口重新获得焦点时也会刷新云端资料
- 同一条记录在另一台设备更新后，旧页面会拒绝覆盖并提示重新打开
- Postgres 行级安全策略按账号隔离故事资料

## 连接 Supabase

应用代码已经准备好连接配置和数据库迁移。需要先有一个 Supabase 项目；当前仓库不会自动创建云端项目。

1. 在 Supabase 控制台创建项目，启用邮箱和密码登录。
2. 打开 SQL Editor，把 `supabase/migrations/` 中的迁移文件完整内容运行一次。它会创建故事、人物、事件、事件人物关联和人物关系表，设置行级安全策略，并将这些表加入实时更新 publication。
3. 在 Auth URL Configuration 中，将本地 `http://localhost:5173` 和部署后的站点地址加入允许的 Redirect URLs。
4. 在项目的 Connect 页面复制 Project URL 和 **Publishable Key**。
5. 在项目根目录创建 `.env.local`，填写：

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

6. 安装依赖并启动：

   ```sh
   npm install
   npm run dev
   ```

7. 要从手机和其他电脑访问，需要把网页部署到可访问的托管服务，并在托管服务中设置相同的两个环境变量。

浏览器端只使用 Publishable Key。不要把 Supabase Secret 或旧版 `service_role` Key 放进 `.env.local` 前端变量或部署到浏览器的代码中。

## 技术结构

- React + Vite：响应式网页界面
- Supabase Auth：账号与会话
- Supabase Postgres：多设备共用的云端数据
- RLS：数据库级账号隔离
- Supabase Realtime：已打开页面之间的变化通知

第一版要求联网后编辑。故事时间可以使用自定义文字日期；只有填写精确日期时才会自动计算年龄。
