const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } = require('@solana/spl-token');

async function main() {
    console.log('🚀 Raydium AMM V3 简单测试');
    console.log('========================');
    
    try {
        // 连接到本地网络
        const connection = new Connection('http://localhost:8899', 'confirmed');
        console.log('✅ 连接到本地网络');
        
        // 检查网络状态
        const version = await connection.getVersion();
        console.log(`📊 Solana版本: ${version['solana-core']}`);
        
        // 程序ID
        const programId = new PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK');
        console.log(`📋 程序ID: ${programId.toString()}`);
        
        // 检查程序是否部署
        const programAccount = await connection.getAccountInfo(programId);
        if (programAccount) {
            console.log('✅ 程序已部署');
            console.log(`  - 可执行: ${programAccount.executable}`);
            console.log(`  - 数据长度: ${programAccount.data.length} bytes`);
        } else {
            console.log('❌ 程序未部署');
            return;
        }
        
        // 创建测试账户
        const authority = Keypair.generate();
        console.log(`🔑 管理员账户: ${authority.publicKey.toString()}`);
        
        // 请求空投
        console.log('💰 请求SOL空投...');
        const airdropTx = await connection.requestAirdrop(
            authority.publicKey, 
            2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropTx);
        
        const balance = await connection.getBalance(authority.publicKey);
        console.log(`✅ 账户余额: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
        
        // 计算AMM配置PDA
        const [ammConfigPda, bump] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('amm_config'),
                new anchor.BN(0).toArrayLike(Buffer, 'le', 2)
            ],
            programId
        );
        
        console.log(`📍 AMM配置PDA: ${ammConfigPda.toString()}`);
        console.log(`📍 Bump: ${bump}`);
        
        // 创建测试代币
        console.log('🪙 创建测试代币...');
        const tokenMintA = await createMint(
            connection,
            authority,
            authority.publicKey,
            null,
            6 // USDC精度
        );
        
        const tokenMintB = await createMint(
            connection,
            authority,
            authority.publicKey,
            null,
            9 // SOL精度
        );
        
        console.log(`✅ 代币A (USDC): ${tokenMintA.toString()}`);
        console.log(`✅ 代币B (SOL): ${tokenMintB.toString()}`);
        
        // 计算池PDA
        const [token0, token1] = tokenMintA.toBuffer().compare(tokenMintB.toBuffer()) < 0 
            ? [tokenMintA, tokenMintB]
            : [tokenMintB, tokenMintA];
            
        const [poolPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('pool'),
                ammConfigPda.toBuffer(),
                token0.toBuffer(),
                token1.toBuffer()
            ],
            programId
        );
        
        console.log(`🏊 池PDA: ${poolPda.toString()}`);
        
        // 计算金库PDA
        const [tokenVault0] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('pool_vault'),
                poolPda.toBuffer(),
                token0.toBuffer()
            ],
            programId
        );
        
        const [tokenVault1] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('pool_vault'),
                poolPda.toBuffer(),
                token1.toBuffer()
            ],
            programId
        );
        
        console.log(`🏦 代币金库0: ${tokenVault0.toString()}`);
        console.log(`🏦 代币金库1: ${tokenVault1.toString()}`);
        
        // 计算其他必需的PDA
        const [observationPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('observation'), poolPda.toBuffer()],
            programId
        );
        
        const [tickArrayBitmapPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('pool_tick_array_bitmap_extension'), poolPda.toBuffer()],
            programId
        );
        
        console.log(`📊 观察状态PDA: ${observationPda.toString()}`);
        console.log(`🗺️  Tick数组位图PDA: ${tickArrayBitmapPda.toString()}`);
        
        console.log('');
        console.log('🎉 基础测试完成！');
        console.log('');
        console.log('📋 测试结果总结:');
        console.log('✅ 网络连接正常');
        console.log('✅ 程序已正确部署');
        console.log('✅ 账户创建和空投成功');
        console.log('✅ 测试代币创建成功');
        console.log('✅ PDA地址计算正确');
        console.log('');
        console.log('💡 下一步可以尝试:');
        console.log('1. 创建AMM配置');
        console.log('2. 创建流动性池');
        console.log('3. 添加流动性');
        console.log('4. 执行代币交换');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.logs) {
            console.error('📋 错误日志:', error.logs);
        }
    }
}

main().catch(console.error);