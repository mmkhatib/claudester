Feature: I want to set up git as part of the development process. When a new project is created and a folder is created, I want to initialize git in that folder. Everytime a spec, or design, or a task is executed, then a commit is made. If sa task fails and code was generated, then part of the fail handling is to revert that commit or reset to just before the task was executed so we can have a clean environment all the time.


Feature: When a project is deleted, I need to make sure the folder where the code was generated was also deleted.

To consider: what happens when tasks are deleted or regenerated? what do we do with the code that was produced because of it?


Result I want multiagent support to kick off tasks that can be done in parallel, and queueing of all tasks in order of what they should be done, especially when they cross specs. So spec001.task001 goes first, then spec001.task002 and spec001.task003 and spec002.task001 can all go in parallel, then three subagents are kicked off to do the work in parallel.


Goal: my ultimate goal is to have a multi-agent development using claude code without losing on the project being crappy because mutliple agents are writing the code asynchronysly.

workflow:
* start a project
* project is created locally and initialized
* Specs for the project and AI generated and dependencies/order of development are set
* for specs, requirements/design/tasks can be created for one or many (bulk) at the same time
* Tasks are analyzed and prioritized
* user can then kick off one, or many tasks at the same time
* user can kick off one spec or multiple specs for development so all the tasks under that can be queued
* tasks that can be ran un parallel across a single or many specs are then ran in parallel using agents.
* one button to queue all the tasks and have all the code be generated
* Every time a task is complete then a commit is created




