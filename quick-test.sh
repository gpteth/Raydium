#!/bin/bash

echo "🚀 Raydium AMM V3 快速测试"
echo "========================"

# 检查依赖
if ! command -v solana &> /dev/null; then
    echo "❌ 请先安装 Solana CLI"
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo "❌ 请先安装 Anchor CLI"
    exit 1
fi

# 配置环境
echo "⚙️  配置环境..."
solana config set --url localhost > /dev/null
solana config set --keypair ~/.config/solana/id.json > /dev/null

# 生成密钥对（如果不存在）
if [ ! -f ~/.config/solana/id.json ]; then
    echo "🔑 生成密钥对..."
    solana-keygen new --outfile ~/.config/solana/id.json --no-bip39-passphrase > /dev/null
fi

echo "💰 钱包地址: $(solana address)"

# 清理旧进程
pkill -f solana-test-validator 2>/dev/null || true
sleep 2

# 启动验证器
echo "🏗️  启动验证器..."
solana-test-validator --reset --quiet > /tmp/validator.log 2>&1 &
VALIDATOR_PID=$!

# 等待启动
echo "⏳ 等待验证器启动..."
for i in {1..30}; do
    if solana cluster-version &> /dev/null; then
        echo "✅ 验证器启动成功 (${i}秒)"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ 验证器启动超时"
        kill $VALIDATOR_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# 构建程序
echo "🔨 构建程序..."
if anchor build > /dev/null 2>&1; then
    echo "✅ 程序构建成功"
else
    echo "❌ 程序构建失败"
    kill $VALIDATOR_PID 2>/dev/null || true
    exit 1
fi

# 部署程序
echo "🚀 部署程序..."
if anchor deploy > /dev/null 2>&1; then
    echo "✅ 程序部署成功"
else
    echo "❌ 程序部署失败"
    kill $VALIDATOR_PID 2>/dev/null || true
    exit 1
fi

# 安装Node.js依赖
echo "📦 安装依赖..."
npm install --silent @solana/web3.js @solana/spl-token @coral-xyz/anchor > /dev/null 2>&1

# 运行简单测试
echo "🧪 运行测试..."
echo ""
node simple-test.js

# 清理
echo ""
echo "🧹 清理环境..."
kill $VALIDATOR_PID 2>/dev/null || true

echo "🎉 测试完成！"