Feature: I want to set up git as part of the development process. When a new project is created and a folder is created, I want to initialize git in that folder. Everytime a spec, or design, or a task is executed, then a commit is made. If sa task fails and code was generated, then part of the fail handling is to revert that commit or reset to just before the task was executed so we can have a clean environment all the time.


Feature: When a project is deleted, I need to make sure the folder where the code was generated was also deleted.

I want multiagent support to kick off tasks that can be done in parallel, and queueing of all tasks in order of what they should be done, especially when they cross specs. So spec001.task001 goes first, then spec001.task002 and spec001.task003 and spec002.task001 can all go in parallel, then three subagents are kicked off to do the work in parallel.


