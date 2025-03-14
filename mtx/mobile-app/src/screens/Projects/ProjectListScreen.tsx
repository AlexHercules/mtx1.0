import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { ProjectCard, EmptyState, ErrorState } from '../../components';
import { projectService } from '../../services';
import { Project } from '../../types';
import { colors } from '../../theme';

const ProjectListScreen: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const navigation = useNavigation();
  
  const fetchProjects = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }
      
      const response = await projectService.getProjects({ page: pageNum, limit: 10 });
      
      if (pageNum === 1) {
        setProjects(response.projects);
      } else {
        setProjects(prev => [...prev, ...response.projects]);
      }
      
      setHasMore(response.pagination.page < response.pagination.pages);
      setPage(pageNum);
      setError(null);
    } catch (err) {
      setError('加载项目失败，请稍后再试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  
  const handleRefresh = () => {
    fetchProjects(1, true);
  };
  
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchProjects(page + 1);
    }
  };
  
  const renderItem = ({ item }: { item: Project }) => (
    <ProjectCard
      project={item}
      onPress={() => navigation.navigate('ProjectDetail', { projectId: item._id })}
    />
  );
  
  if (loading && !refreshing && projects.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  if (error && projects.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => fetchProjects()}
      />
    );
  }
  
  return (
    <FlatList
      data={projects}
      renderItem={renderItem}
      keyExtractor={item => item._id}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        hasMore && projects.length > 0 ? (
          <ActivityIndicator style={styles.footer} size="small" color={colors.primary} />
        ) : null
      }
      ListEmptyComponent={
        !loading && !error ? (
          <EmptyState message="暂无项目" />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 16,
  },
});

export default ProjectListScreen; 