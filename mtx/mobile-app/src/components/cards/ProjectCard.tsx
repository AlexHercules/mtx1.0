import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { Project } from '../../types';
import { formatCurrency, calculateDaysLeft } from '../../utils';
import { ProgressBar } from '../common';
import { colors, typography } from '../../theme';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onPress }) => {
  // 使用useMemo缓存计算结果
  const progressPercentage = useMemo(() => {
    return Math.min(100, Math.round((project.currentFunding / project.fundingGoal) * 100));
  }, [project.currentFunding, project.fundingGoal]);
  
  const daysLeft = useMemo(() => {
    return calculateDaysLeft(project.endDate);
  }, [project.endDate]);
  
  const mainImage = useMemo(() => {
    return project.images && project.images.length > 0
      ? { uri: project.images[0].url }
      : require('../../assets/images/project-placeholder.png');
  }, [project.images]);
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={mainImage} style={styles.image} />
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {project.title}
        </Text>
        
        <Text style={styles.description} numberOfLines={2}>
          {project.shortDescription}
        </Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatCurrency(project.currentFunding)}
            </Text>
            <Text style={styles.statLabel}>已筹资金</Text>
          </View>
          
          <View style={styles.stat}>
            <Text style={styles.statValue}>{progressPercentage}%</Text>
            <Text style={styles.statLabel}>已达目标</Text>
          </View>
          
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {daysLeft > 0 ? `${daysLeft}天` : '已结束'}
            </Text>
            <Text style={styles.statLabel}>剩余时间</Text>
          </View>
        </View>
        
        <ProgressBar progress={progressPercentage} />
        
        <View style={styles.footer}>
          <View style={styles.category}>
            <Text style={styles.categoryText}>{project.category}</Text>
          </View>
          
          <Text style={styles.backers}>
            {project.backers.length}人支持
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  title: {
    ...typography.subtitle,
    marginBottom: 8,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    ...typography.subtitle,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  category: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary,
  },
  backers: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default React.memo(ProjectCard); 