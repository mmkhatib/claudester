#!/usr/bin/env node
"use strict";
/**
 * Agent Runner
 * This script runs in a child process and executes agent tasks
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRunner = void 0;
var mongodb_1 = require("@/lib/mongodb");
var models_1 = require("@/backend/models");
var AgentRunner = /** @class */ (function () {
    function AgentRunner(context) {
        this.heartbeatInterval = null;
        this.shutdownRequested = false;
        this.context = context;
    }
    /**
     * Initialize the agent
     */
    AgentRunner.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var agent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.log('info', 'Agent initializing', this.context);
                        // Connect to database
                        return [4 /*yield*/, (0, mongodb_1.connectDB)()];
                    case 1:
                        // Connect to database
                        _a.sent();
                        return [4 /*yield*/, models_1.Agent.findOne({ agentId: this.context.agentId })];
                    case 2:
                        agent = _a.sent();
                        if (!agent) {
                            throw new Error("Agent ".concat(this.context.agentId, " not found in database"));
                        }
                        agent.status = models_1.AgentStatus.RUNNING;
                        return [4 /*yield*/, agent.save()];
                    case 3:
                        _a.sent();
                        // Start heartbeat
                        this.startHeartbeat();
                        // Set up shutdown handlers
                        this.setupShutdownHandlers();
                        this.log('info', 'Agent initialized successfully');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start heartbeat to parent process
     */
    AgentRunner.prototype.startHeartbeat = function () {
        var _this = this;
        this.heartbeatInterval = setInterval(function () {
            if (_this.shutdownRequested)
                return;
            var memUsage = process.memoryUsage();
            var cpuUsage = process.cpuUsage();
            _this.sendMessage('heartbeat', {
                cpu: cpuUsage.user + cpuUsage.system,
                memory: memUsage.heapUsed,
                timestamp: new Date(),
            });
        }, 10000); // Every 10 seconds
    };
    /**
     * Set up shutdown handlers
     */
    AgentRunner.prototype.setupShutdownHandlers = function () {
        var _this = this;
        // Handle shutdown message from parent
        process.on('message', function (message) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(message.type === 'shutdown')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.shutdown(message.reason || 'parent request')];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
        // Handle process signals
        process.on('SIGTERM', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.shutdown('SIGTERM')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        process.on('SIGINT', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.shutdown('SIGINT')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    /**
     * Execute the agent task
     */
    AgentRunner.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            var task, _a, error_1, task;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.log('info', 'Starting task execution');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 14, , 19]);
                        return [4 /*yield*/, models_1.Task.findById(this.context.taskId)
                                .populate('specId')];
                    case 2:
                        task = _b.sent();
                        if (!task) {
                            throw new Error("Task ".concat(this.context.taskId, " not found"));
                        }
                        // Update task status
                        task.status = models_1.TaskStatus.IN_PROGRESS;
                        return [4 /*yield*/, task.save()];
                    case 3:
                        _b.sent();
                        this.log('info', 'Task loaded', {
                            taskType: task.type,
                            description: task.description,
                        });
                        // Send progress update
                        this.sendMessage('progress', {
                            status: 'started',
                            progress: 0,
                        });
                        _a = this.context.agentType;
                        switch (_a) {
                            case 'DEVELOPMENT': return [3 /*break*/, 4];
                            case 'TEST': return [3 /*break*/, 6];
                            case 'TDD': return [3 /*break*/, 8];
                        }
                        return [3 /*break*/, 10];
                    case 4: return [4 /*yield*/, this.executeDevelopment(task)];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 6: return [4 /*yield*/, this.executeTest(task)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 8: return [4 /*yield*/, this.executeTDD(task)];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 10: throw new Error("Unknown agent type: ".concat(this.context.agentType));
                    case 11:
                        // Mark task as completed
                        task.status = models_1.TaskStatus.COMPLETED;
                        return [4 /*yield*/, task.save()];
                    case 12:
                        _b.sent();
                        this.log('info', 'Task completed successfully');
                        // Send final progress
                        this.sendMessage('progress', {
                            status: 'completed',
                            progress: 100,
                        });
                        // Exit successfully
                        return [4 /*yield*/, this.shutdown('completed', 0)];
                    case 13:
                        // Exit successfully
                        _b.sent();
                        return [3 /*break*/, 19];
                    case 14:
                        error_1 = _b.sent();
                        this.log('error', 'Task execution failed', { error: error_1 });
                        return [4 /*yield*/, models_1.Task.findById(this.context.taskId)];
                    case 15:
                        task = _b.sent();
                        if (!task) return [3 /*break*/, 17];
                        task.status = models_1.TaskStatus.FAILED;
                        return [4 /*yield*/, task.save()];
                    case 16:
                        _b.sent();
                        _b.label = 17;
                    case 17:
                        // Send error to parent
                        this.sendMessage('error', {
                            message: error_1 instanceof Error ? error_1.message : String(error_1),
                            stack: error_1 instanceof Error ? error_1.stack : undefined,
                        });
                        // Exit with error
                        return [4 /*yield*/, this.shutdown('error', 1)];
                    case 18:
                        // Exit with error
                        _b.sent();
                        return [3 /*break*/, 19];
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute development task
     */
    AgentRunner.prototype.executeDevelopment = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.log('info', 'Executing development task');
                        // TODO: Implement development task execution
                        // This will integrate with Claude Code API to:
                        // 1. Analyze task requirements
                        // 2. Generate code
                        // 3. Write files
                        // 4. Run tests
                        // 5. Verify acceptance criteria
                        this.sendMessage('progress', {
                            status: 'in_progress',
                            progress: 50,
                            message: 'Development task execution not yet implemented',
                        });
                        // Placeholder - simulate work
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                    case 1:
                        // Placeholder - simulate work
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute test task
     */
    AgentRunner.prototype.executeTest = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.log('info', 'Executing test task');
                        // TODO: Implement test execution
                        // This will:
                        // 1. Set up test environment
                        // 2. Run test suite
                        // 3. Collect results
                        // 4. Report coverage
                        this.sendMessage('progress', {
                            status: 'in_progress',
                            progress: 50,
                            message: 'Test task execution not yet implemented',
                        });
                        // Placeholder
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                    case 1:
                        // Placeholder
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute TDD task
     */
    AgentRunner.prototype.executeTDD = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.log('info', 'Executing TDD task');
                        // TODO: Implement TDD workflow
                        // This will:
                        // 1. Write tests first
                        // 2. Run tests (should fail)
                        // 3. Implement code
                        // 4. Run tests (should pass)
                        // 5. Refactor if needed
                        this.sendMessage('progress', {
                            status: 'in_progress',
                            progress: 50,
                            message: 'TDD task execution not yet implemented',
                        });
                        // Placeholder
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                    case 1:
                        // Placeholder
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send message to parent process
     */
    AgentRunner.prototype.sendMessage = function (type, data) {
        if (process.send) {
            process.send({ type: type, data: data, agentId: this.context.agentId });
        }
    };
    /**
     * Log message
     */
    AgentRunner.prototype.log = function (level, message, data) {
        var logData = __assign(__assign({ level: level, agentId: this.context.agentId, taskId: this.context.taskId, message: message }, data), { timestamp: new Date() });
        console.log(JSON.stringify(logData));
        this.sendMessage('log', logData);
    };
    /**
     * Shutdown agent
     */
    AgentRunner.prototype.shutdown = function (reason_1) {
        return __awaiter(this, arguments, void 0, function (reason, exitCode) {
            var agent, error_2;
            if (exitCode === void 0) { exitCode = 0; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.shutdownRequested)
                            return [2 /*return*/];
                        this.shutdownRequested = true;
                        this.log('info', 'Agent shutting down', { reason: reason, exitCode: exitCode });
                        // Stop heartbeat
                        if (this.heartbeatInterval) {
                            clearInterval(this.heartbeatInterval);
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, models_1.Agent.findOne({ agentId: this.context.agentId })];
                    case 2:
                        agent = _a.sent();
                        if (!agent) return [3 /*break*/, 4];
                        agent.status = exitCode === 0 ? models_1.AgentStatus.COMPLETED : models_1.AgentStatus.FAILED;
                        return [4 /*yield*/, agent.save()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        console.error('Failed to update agent status:', error_2);
                        return [3 /*break*/, 6];
                    case 6:
                        // Exit
                        process.exit(exitCode);
                        return [2 /*return*/];
                }
            });
        });
    };
    return AgentRunner;
}());
exports.AgentRunner = AgentRunner;
// Main execution
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var args, agentId, taskId, workspacePath, agentType, context, runner, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    args = process.argv.slice(2);
                    agentId = args[args.indexOf('--agent-id') + 1];
                    taskId = args[args.indexOf('--task-id') + 1];
                    workspacePath = args[args.indexOf('--workspace') + 1];
                    agentType = process.env.AGENT_TYPE || 'DEVELOPMENT';
                    if (!agentId || !taskId || !workspacePath) {
                        console.error('Missing required arguments');
                        process.exit(1);
                    }
                    context = {
                        agentId: agentId,
                        taskId: taskId,
                        workspacePath: workspacePath,
                        agentType: agentType,
                    };
                    runner = new AgentRunner(context);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, runner.initialize()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, runner.execute()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _a.sent();
                    console.error('Agent runner failed:', error_3);
                    process.exit(1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Run if called directly
if (require.main === module) {
    main().catch(function (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
