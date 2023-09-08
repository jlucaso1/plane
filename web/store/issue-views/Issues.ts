import { observable, action, computed, makeObservable, runInAction } from "mobx";
// types
import { RootStore } from "../root";
// services
import { UserService } from "services/user.service";
import { ProjectIssuesServices } from "services/issues.service";
import { ProjectIssuesServices as ProjectModuleServices } from "services/modules.service";
import { ProjectCycleServices } from "services/cycles.service";
// types
import { TIssueLayouts, TIssueViews } from "./issue_filters";

export interface IIssues {
  [key: string]: any;
}

export interface IIssuesLayout {
  list: IIssues;
  kanban: IIssues;
  calendar: IIssues;
  spreadsheet: IIssues;
  gantt: IIssues;
}

export interface IIssueState {
  [key: string]: {
    my_issues: IIssuesLayout;
    project_issues: {
      [key: string]: {
        issues: IIssuesLayout;
        cycles: {
          [key: string]: IIssuesLayout;
        };
        modules: {
          [key: string]: IIssuesLayout;
        };
        views: {
          [key: string]: IIssuesLayout;
        };
      };
    };
  };
}

export interface IIssueViewStore {
  loader: boolean;
  error: any | null;
  issues: IIssueState;
  // computed
  getIssues: IIssues | null | undefined;
  // actions
  getMyIssuesAsync: (
    workspaceId: string,
    _view: TIssueViews,
    _layout: TIssueLayouts
  ) => null | Promise<any>;
  getProjectIssuesAsync: (
    workspaceId: string,
    projectId: string,
    _view: TIssueViews,
    _layout: TIssueLayouts
  ) => null | Promise<any>;
  getIssuesForModulesAsync: (
    workspaceId: string,
    projectId: string,
    moduleId: string,
    _view: TIssueViews,
    _layout: TIssueLayouts
  ) => null | Promise<any>;
  getIssuesForCyclesAsync: (
    workspaceId: string,
    projectId: string,
    cycleId: string,
    _view: TIssueViews,
    _layout: TIssueLayouts
  ) => null | Promise<any>;
  getIssuesForViewsAsync: (
    workspaceId: string,
    projectId: string,
    viewId: string,
    _view: TIssueViews,
    _layout: TIssueLayouts
  ) => null | Promise<any>;
}

class IssueViewStore implements IIssueViewStore {
  loader: boolean = false;
  error: any | null = null;
  issues: IIssueState = {};
  // root store
  rootStore;
  // service
  issueService;
  userService;
  modulesService;
  cyclesService;

  constructor(_rootStore: RootStore) {
    makeObservable(this, {
      // observable
      loader: observable,
      error: observable,
      issues: observable.ref,
      // action
      getMyIssuesAsync: action,
      getProjectIssuesAsync: action,
      getIssuesForModulesAsync: action,
      getIssuesForCyclesAsync: action,
      getIssuesForViewsAsync: action,
      // computed
      getIssues: computed,
    });

    this.rootStore = _rootStore;
    this.issueService = new ProjectIssuesServices();
    this.userService = new UserService();
    this.modulesService = new ProjectModuleServices();
    this.cyclesService = new ProjectCycleServices();
  }

  // computed
  get getIssues() {
    if (this.issues != null) {
      const currentView: TIssueViews | null = this.rootStore.issueFilters.issueView;
      const currentLayout: TIssueLayouts | null = this.rootStore.issueFilters.issueLayout;
      const currentWorkspaceId: string | null = this.rootStore.issueFilters.workspaceId;
      const currentProjectId: string | null = this.rootStore.issueFilters.projectId;
      const currentModuleId: string | null = this.rootStore.issueFilters.moduleId;
      const currentCycleId: string | null = this.rootStore.issueFilters.cycleId;
      const currentViewId: string | null = this.rootStore.issueFilters.viewId;

      if (!currentView || !currentLayout || !currentWorkspaceId) return null;

      if (currentView === "my_issues")
        return this.issues?.[currentWorkspaceId]?.my_issues?.[currentLayout];
      else if (currentView === "issues" && currentProjectId)
        return this.issues?.[currentWorkspaceId]?.project_issues?.[currentProjectId]?.issues?.[
          currentLayout
        ];
      else if (currentView === "modules" && currentProjectId && currentModuleId)
        return this.issues?.[currentWorkspaceId]?.project_issues?.[currentProjectId]?.modules?.[
          currentModuleId
        ]?.[currentLayout];
      else if (currentView === "cycles" && currentProjectId && currentCycleId)
        return this.issues?.[currentWorkspaceId]?.project_issues?.[currentProjectId]?.cycles?.[
          currentCycleId
        ]?.[currentLayout];
      else if (currentView === "views" && currentProjectId && currentViewId)
        return this.issues?.[currentWorkspaceId]?.project_issues?.[currentProjectId]?.views?.[
          currentViewId
        ]?.[currentLayout];
    }
  }

  // fetching my issues
  getMyIssuesAsync = async (workspaceId: string, _view: TIssueViews, _layout: TIssueLayouts) => {
    try {
      this.loader = true;
      this.error = null;

      const filteredParams = this.rootStore.issueFilters.getComputedFilters(
        workspaceId,
        null,
        null,
        null,
        null,
        _view,
        _layout
      );
      const issuesResponse = await this.userService.userIssues(workspaceId, filteredParams);

      if (issuesResponse) {
        const _issueResponse: any = {
          ...this.issues,
          [workspaceId]: {
            ...this?.issues[workspaceId],
            my_issues: {
              ...this?.issues[workspaceId]?.my_issues,
              [_layout as string]: issuesResponse,
            },
          },
        };

        runInAction(() => {
          this.issues = _issueResponse;
          this.loader = false;
          this.error = null;
        });
      }

      return issuesResponse;
    } catch (error) {
      console.warn("error", error);
      this.loader = false;
      this.error = null;
      return error;
    }
  };

  // fetching project issues
  getProjectIssuesAsync = async (
    workspaceId: string,
    projectId: string,
    _view: TIssueViews,
    _layout: TIssueLayouts
  ) => {
    try {
      this.loader = true;
      this.error = null;

      const filteredParams = this.rootStore.issueFilters.getComputedFilters(
        workspaceId,
        projectId,
        null,
        null,
        null,
        _view,
        _layout
      );
      const issuesResponse = await this.issueService.getIssuesWithParams(
        workspaceId,
        projectId,
        filteredParams
      );

      if (issuesResponse) {
        const _issueResponse: any = {
          ...this.issues,
          [workspaceId]: {
            ...this?.issues?.[workspaceId],
            project_issues: {
              ...this?.issues?.[workspaceId]?.project_issues,
              [projectId]: {
                ...this?.issues?.[workspaceId]?.project_issues?.[projectId],
                issues: {
                  ...this?.issues[workspaceId]?.project_issues?.[projectId]?.issues,
                  [_layout as string]: issuesResponse,
                },
              },
            },
          },
        };

        runInAction(() => {
          this.issues = _issueResponse;
          this.loader = false;
          this.error = null;
        });
      }

      return issuesResponse;
    } catch (error) {
      console.warn("error", error);
      this.loader = false;
      this.error = null;
      return error;
    }
  };

  // fetching project issues for modules
  getIssuesForModulesAsync = async (
    workspaceId: string,
    projectId: string,
    moduleId: string,
    _view: TIssueViews,
    _layout: TIssueLayouts
  ) => {
    try {
      this.loader = true;
      this.error = null;

      const filteredParams = this.rootStore.issueFilters.getComputedFilters(
        workspaceId,
        projectId,
        moduleId,
        null,
        null,
        _view,
        _layout
      );
      const issuesResponse = await this.modulesService.getModuleIssuesWithParams(
        workspaceId,
        projectId,
        moduleId,
        filteredParams
      );

      if (issuesResponse) {
        const _issueResponse: any = {
          ...this.issues,
          [workspaceId]: {
            ...this?.issues?.[workspaceId],
            project_issues: {
              ...this?.issues?.[workspaceId]?.project_issues,
              [projectId]: {
                ...this?.issues?.[workspaceId]?.project_issues?.[projectId],
                modules: {
                  ...this?.issues[workspaceId]?.project_issues?.[projectId]?.modules,
                  [moduleId]: {
                    ...this?.issues[workspaceId]?.project_issues?.[projectId]?.modules?.[moduleId],
                    [_layout as string]: issuesResponse,
                  },
                },
              },
            },
          },
        };

        runInAction(() => {
          this.issues = _issueResponse;
          this.loader = false;
          this.error = null;
        });
      }

      return issuesResponse;
    } catch (error) {
      console.warn("error", error);
      this.loader = false;
      this.error = null;
      return error;
    }
  };

  // fetching project issues for cycles
  getIssuesForCyclesAsync = async (
    workspaceId: string,
    projectId: string,
    cycleId: string,
    _view: TIssueViews,
    _layout: TIssueLayouts
  ) => {
    try {
      this.loader = true;
      this.error = null;

      const filteredParams = this.rootStore.issueFilters.getComputedFilters(
        workspaceId,
        projectId,
        null,
        cycleId,
        null,
        _view,
        _layout
      );
      const issuesResponse = await this.cyclesService.getCycleIssuesWithParams(
        workspaceId,
        projectId,
        cycleId,
        filteredParams
      );

      if (issuesResponse) {
        const _issueResponse: any = {
          ...this.issues,
          [workspaceId]: {
            ...this?.issues?.[workspaceId],
            project_issues: {
              ...this?.issues?.[workspaceId]?.project_issues,
              [projectId]: {
                ...this?.issues?.[workspaceId]?.project_issues?.[projectId],
                cycles: {
                  ...this?.issues[workspaceId]?.project_issues?.[projectId]?.cycles,
                  [cycleId]: {
                    ...this?.issues[workspaceId]?.project_issues?.[projectId]?.cycles?.[cycleId],
                    [_layout as string]: issuesResponse,
                  },
                },
              },
            },
          },
        };

        runInAction(() => {
          this.issues = _issueResponse;
          this.loader = false;
          this.error = null;
        });
      }

      return issuesResponse;
    } catch (error) {
      console.warn("error", error);
      this.loader = false;
      this.error = null;
      return error;
    }
  };

  // fetching project issues for views
  getIssuesForViewsAsync = async (
    workspaceId: string,
    projectId: string,
    viewId: string,
    _view: TIssueViews,
    _layout: TIssueLayouts
  ) => {
    try {
      this.loader = true;
      this.error = null;

      const filteredParams = this.rootStore.issueFilters.getComputedFilters(
        workspaceId,
        projectId,
        null,
        null,
        viewId,
        _view,
        _layout
      );
      const issuesResponse = await this.issueService.getIssuesWithParams(
        workspaceId,
        projectId,
        filteredParams
      );

      if (issuesResponse) {
        const _issueResponse: any = {
          ...this.issues,
          [workspaceId]: {
            ...this?.issues?.[workspaceId],
            project_issues: {
              ...this?.issues?.[workspaceId]?.project_issues,
              [projectId]: {
                ...this?.issues?.[workspaceId]?.project_issues?.[projectId],
                views: {
                  ...this?.issues[workspaceId]?.project_issues?.[projectId]?.views,
                  [viewId]: {
                    ...this?.issues[workspaceId]?.project_issues?.[projectId]?.views?.[viewId],
                    [_layout as string]: issuesResponse,
                  },
                },
              },
            },
          },
        };

        runInAction(() => {
          this.issues = _issueResponse;
          this.loader = false;
          this.error = null;
        });
      }

      return issuesResponse;
    } catch (error) {
      console.warn("error", error);
      this.loader = false;
      this.error = null;
      return error;
    }
  };
}

export default IssueViewStore;