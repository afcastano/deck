import * as React from 'react';
import { Debounce } from 'lodash-decorators';
import { Subscription } from 'rxjs';
import { Application } from 'core/application/application.model';
import { FilterTags, IFilterTag } from 'core/filterModel/FilterTags';
import { IFunctionGroup } from 'core/domain';
import { FunctionState } from 'core/state';
import { Spinner } from 'core/widgets/spinners/Spinner';
import { FunctionGroupings } from './FunctionGroupings';
import { CreateFunctionButton } from 'core/function/CreateFunctionButton';

export interface IFunctionsProps {
  app: Application;
}

export interface IFunctionsState {
  initialized: boolean;
  groups: IFunctionGroup[];
  tags: IFilterTag[];
}

export class Functions extends React.Component<IFunctionsProps, IFunctionsState> {
  private groupsUpdatedListener: Subscription;
  private functionsRefreshUnsubscribe: () => any;

  constructor(props: IFunctionsProps) {
    super(props);
    this.state = {
      initialized: false,
      groups: [],
      tags: [],
    };
  }

  public componentDidMount(): void {
    const { app } = this.props;

    this.groupsUpdatedListener = FunctionState.filterService.groupsUpdatedStream.subscribe(() => this.groupsUpdated());
    FunctionState.filterModel.asFilterModel.activate();
    this.functionsRefreshUnsubscribe = app
      .getDataSource('functions')
      .onRefresh(null, () => this.updateFunctionGroups());
    app.setActiveState(app.loadBalancers);
    this.updateFunctionGroups();
  }

  public componentWillUnmount(): void {
    this.groupsUpdatedListener.unsubscribe();
    this.functionsRefreshUnsubscribe();
  }

  private groupsUpdated(): void {
    this.setState({
      groups: FunctionState.filterModel.asFilterModel.groups,
      tags: FunctionState.filterModel.asFilterModel.tags,
    });
  }

  @Debounce(200)
  private updateFunctionGroups(): void {
    FunctionState.filterModel.asFilterModel.applyParamsToUrl();
    FunctionState.filterService.updateFunctionGroups(this.props.app);
    this.groupsUpdated();

    if (this.props.app.getDataSource('functions').loaded) {
      this.setState({ initialized: true });
    }
  }

  private clearFilters = (): void => {
    FunctionState.filterService.clearFilters();
    this.updateFunctionGroups();
  };

  private tagCleared = (): void => {
    this.updateFunctionGroups();
  };

  public render(): React.ReactElement<Functions> {
    const groupings = this.state.initialized ? (
      <div>
        <FunctionGroupings app={this.props.app} groups={this.state.groups} />
        {this.state.groups.length === 0 && (
          <div>
            <h4 className="text-center">No functions match the filters you've selected.</h4>
          </div>
        )}
      </div>
    ) : (
      <div>
        <Spinner size="medium" />
      </div>
    );

    return (
      <div className="main-content functions">
        <div className="header row header-clusters">
          <div className="col-lg-4 col-md-2">
            <div className="form-inline clearfix filters" />
            <div className="application-actions">
              <CreateFunctionButton app={this.props.app} />
            </div>
          </div>
          <FilterTags tags={this.state.tags} tagCleared={this.tagCleared} clearFilters={this.clearFilters} />
        </div>
        <div className="content">{groupings}</div>
      </div>
    );
  }
}
